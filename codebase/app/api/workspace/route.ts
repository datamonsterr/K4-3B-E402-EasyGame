import { z } from "zod";
import { configured, sessionClient } from "@/backend/database/client";
import { requireActor } from "@/backend/auth/authorize";
export async function GET(request: Request) {
  const guild = z
    .uuid()
    .safeParse(new URL(request.url).searchParams.get("guild"));
  if (!guild.success)
    return Response.json(
      { error: "Valid guild UUID required" },
      { status: 400 },
    );
  if (!configured())
    return Response.json(
      { error: "Workspace database unavailable" },
      { status: 503 },
    );
  const client = await sessionClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  try {
    const actor = await requireActor(
      user.id,
      guild.data,
      "read",
      async (userId, guildId) => {
        const { data, error } = await client
          .from("memberships")
          .select("role")
          .eq("guild_id", guildId)
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
    );
    const { data, error } = await client
      .from("source_messages")
      .select("id,source_label,sent_at,content,reply_resolution")
      .eq("guild_id", actor.guildId)
      .order("sent_at", { ascending: false })
      .limit(50);
    if (error)
      return Response.json(
        { error: "Could not load messages" },
        { status: 502 },
      );
    return Response.json(
      { actor, messages: data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
}
