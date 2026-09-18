import { z } from "zod";
import {
  sessionClient,
  jobClient,
  configured,
} from "@/backend/database/client";

const roleSchema = z.object({
  role: z.enum(["learner", "lab_coach"]),
  guildId: z.string().optional(),
});

export async function POST(request: Request) {
  if (!configured()) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const raw = await request.text();
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return Response.json(
        { error: "Invalid role specified" },
        { status: 400 },
      );
    }

    const input = roleSchema.safeParse(body);
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

    // Check if membership already exists with a role (role immutability)
    const { data: existingMembership, error: fetchError } = await supabase
      .from("memberships")
      .select("role")
      .eq("guild_id", targetGuildId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      return Response.json(
        { error: `Database check failed: ${fetchError.message}` },
        { status: 502 },
      );
    }

    if (existingMembership && existingMembership.role) {
      return Response.json(
        {
          error:
            "Role is permanently locked after onboarding and cannot be changed",
        },
        { status: 403 },
      );
    }

    // Upsert membership in database using privileged job client if available, or session client
    let dbClient = supabase;
    try {
      dbClient = jobClient() as unknown as typeof supabase;
    } catch {
      // Job credentials might not be configured in preview, use session client
    }

    const { error: upsertError } = await dbClient.from("memberships").upsert(
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
      { error: "Authentication unavailable" },
      { status: 503 },
    );
  }
}
