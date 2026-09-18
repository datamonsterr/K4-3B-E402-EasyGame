import { configured, sessionClient } from "@/backend/database/client";
import { sameOrigin } from "@/backend/auth/http";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (!configured())
    return Response.json(
      { error: "Authentication unavailable" },
      { status: 503 },
    );
  const client = await sessionClient();
  const { error } = await client.auth.signOut();
  return error
    ? Response.json({ error: "Sign-out failed" }, { status: 502 })
    : Response.json({ ok: true });
}
