import { configured, sessionClient } from "@/backend/database/client";
export async function GET() {
  if (!configured())
    return Response.json(
      { error: "Authentication unavailable" },
      { status: 503 },
    );
  const client = await sessionClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user)
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  const { data, error: queryError } = await client
    .from("memberships")
    .select("guild_id,role")
    .eq("user_id", user.id);
  if (queryError)
    return Response.json(
      { error: "Membership lookup failed" },
      { status: 502 },
    );
  return Response.json(
    { email: user.email, memberships: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
