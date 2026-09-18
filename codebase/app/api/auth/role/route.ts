import { z } from "zod";
import { sessionClient, configured } from "@/backend/database/client";

const roleSchema = z
  .object({
    role: z.enum(["learner", "lab_coach"]),
    guildId: z.string().optional(),
  })
  .strict();

export async function POST(request: Request) {
  if (!configured()) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const raw = await request.text();
    const input = roleSchema.safeParse(JSON.parse(raw));
    if (!input.success) {
      return Response.json(
        { error: "Invalid role specified" },
        { status: 400 },
      );
    }

    const supabase = await sessionClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let targetGuildId = input.data.guildId;
    if (!targetGuildId) {
      const { data: guilds } = await supabase
        .from("guilds")
        .select("id")
        .limit(1);
      if (guilds && guilds.length > 0) {
        targetGuildId = guilds[0].id;
      } else {
        return Response.json(
          { error: "No cohort guild available" },
          { status: 404 },
        );
      }
    }

    // Upsert membership in database
    const { error: upsertError } = await supabase.from("memberships").upsert(
      {
        guild_id: targetGuildId,
        user_id: user.id,
        role: input.data.role,
      },
      { onConflict: "guild_id,user_id" },
    );

    if (upsertError) {
      return Response.json(
        { error: `Database update failed: ${upsertError.message}` },
        { status: 502 },
      );
    }

    return Response.json({
      ok: true,
      role: input.data.role,
      guildId: targetGuildId,
    });
  } catch {
    return Response.json(
      { error: "Failed to update role in database" },
      { status: 400 },
    );
  }
}
