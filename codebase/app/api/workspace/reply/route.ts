import { z } from "zod";
import { configured, sessionClient } from "@/backend/database/client";
import { requireActor } from "@/backend/auth/authorize";

const replySchema = z
  .object({
    messageId: z.string().min(1),
    content: z.string().trim().min(1).max(2000),
    guildId: z.string().optional(),
    markAnswered: z.boolean().optional().default(true),
  })
  .strict();

export async function POST(request: Request) {
  if (!configured()) {
    return Response.json(
      { error: "Workspace database unavailable" },
      { status: 503 },
    );
  }

  const client = await sessionClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const raw = await request.text();
    const input = replySchema.safeParse(JSON.parse(raw));
    if (!input.success) {
      return Response.json(
        { error: "Invalid reply payload", details: input.error.flatten() },
        { status: 400 },
      );
    }

    let targetGuildId: string;
    if (input.data.guildId) {
      targetGuildId = input.data.guildId;
    } else {
      const { data: guilds } = await client
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

    // Require coach capability in the target guild
    const actor = await requireActor(
      user.id,
      targetGuildId,
      "coach",
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

    // Fetch parent message to obtain channel_id and dataset_id if present
    const { data: parentMsg } = await client
      .from("source_messages")
      .select("id, channel_id, dataset_id, record_ordinal")
      .eq("id", input.data.messageId)
      .maybeSingle();

    const channelId = parentMsg?.channel_id ?? null;
    const datasetId = parentMsg?.dataset_id ?? null;

    // Create reply record in source_messages (push directly to DB, not real Discord)
    const replyId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const { error: insertError } = await client.from("source_messages").insert({
      id: replyId,
      guild_id: actor.guildId,
      channel_id: channelId,
      dataset_id: datasetId,
      record_ordinal: Math.floor(Math.random() * 900000) + 100000,
      source_label: `reply-${Date.now()}`,
      message_type: "reply",
      reply_to_id: input.data.messageId,
      sent_at: nowIso,
      content: input.data.content,
      attachment_count: 0,
      source_char_count: input.data.content.length,
      mentions_bot: false,
      reply_resolution: "resolved",
    });

    if (insertError) {
      return Response.json(
        { error: `Failed to record reply: ${insertError.message}` },
        { status: 502 },
      );
    }

    // If requested, transition question status to 'answered'
    if (input.data.markAnswered) {
      const { data: question } = await client
        .from("questions")
        .select("id, version")
        .eq("message_id", input.data.messageId)
        .maybeSingle();

      if (question) {
        await client
          .from("questions")
          .update({
            status: "answered",
            version: (question.version ?? 0) + 1,
          })
          .eq("id", question.id);

        await client.from("question_events").insert({
          id: crypto.randomUUID(),
          guild_id: actor.guildId,
          question_id: question.id,
          event_type: "replied",
          actor_id: actor.userId,
          occurred_at: nowIso,
          idempotency_key: `reply-event-${replyId}`,
          summary: "Lab Coach in-app direct reply committed to database",
        });
      }
    }

    return Response.json({
      ok: true,
      replyId,
      messageId: input.data.messageId,
      status: "answered",
      sentAt: nowIso,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Forbidden") {
      return Response.json(
        {
          error:
            "Forbidden: Only authorized Lab Coaches can reply directly to messages",
        },
        { status: 403 },
      );
    }
    return Response.json({ error: "Failed to process reply" }, { status: 400 });
  }
}
