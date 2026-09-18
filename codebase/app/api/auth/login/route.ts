import { z } from "zod";
import { configured, sessionClient } from "@/backend/database/client";
import { sameOrigin } from "@/backend/auth/http";
const schema = z
  .object({ email: z.email().max(254), password: z.string().min(1).max(256) })
  .strict();
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 2048)
      return Response.json({ error: "Request too large" }, { status: 413 });
    const input = schema.safeParse(JSON.parse(raw));
    if (!input.success)
      return Response.json(
        { error: "Enter a valid email and password" },
        { status: 400 },
      );
    if (!sameOrigin(request))
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    if (!configured())
      return Response.json(
        { error: "Sign-in is not configured for this deployment" },
        { status: 503 },
      );
    const client = await sessionClient();
    const { error } = await client.auth.signInWithPassword(input.data);
    if (error)
      return Response.json(
        { error: "Unable to sign in with these credentials" },
        { status: 401 },
      );
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Invalid request or unavailable authentication" },
      { status: 400 },
    );
  }
}
