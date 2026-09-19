import assert from "node:assert/strict";
import test from "node:test";
import { loginHostedIdentity } from "../scripts/lib/hosted-auth.ts";

test("authenticates through production routes and forwards an in-memory cookie", async () => {
  const requests: Request[] = [];
  const http = async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push(request);
    const path = new URL(request.url).pathname;
    if (path.endsWith("/login"))
      return new Response('{"ok":true}', {
        status: 200,
        headers: { "set-cookie": "sb-session=opaque; HttpOnly; Secure" },
      });
    if (path.endsWith("/me"))
      return Response.json({
        memberships: [{ guild_id: "g", role: "learner" }],
      });
    return Response.json({ ok: true });
  };
  const session = await loginHostedIdentity(
    "https://app.example",
    {
      email: "a@example.invalid",
      password: "secret",
      guildId: "g",
      role: "learner",
    },
    http as typeof fetch,
  );
  assert.match(requests[1]!.headers.get("cookie") ?? "", /sb-session=opaque/);
  await session.close();
  assert.equal(requests.at(-1)?.headers.get("origin"), "https://app.example");
});

test("rejects ambiguous or wrong membership without exposing credentials", async () => {
  const http = async (input: string | URL | Request) =>
    new URL(input instanceof Request ? input.url : input).pathname.endsWith(
      "/login",
    )
      ? new Response("{}", { status: 200 })
      : Response.json({ memberships: [] });
  await assert.rejects(
    loginHostedIdentity(
      "https://app.example",
      {
        email: "a@example.invalid",
        password: "super-secret",
        guildId: "g",
        role: "learner",
      },
      http as typeof fetch,
    ),
    /membership/,
  );
});
