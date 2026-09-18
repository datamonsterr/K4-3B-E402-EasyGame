import { z } from "zod";
import type { GuildId, NoticeEvidenceSource } from "./contracts";

const callSchema = z
  .object({
    name: z.literal("query_notices"),
    args: z.object({ topicKey: z.string().trim().min(1).max(200) }).strict(),
  })
  .strict();

export function createLogisticsToolExecutor(deps: {
  guildId: GuildId;
  evidence: NoticeEvidenceSource;
}) {
  return async (input: { name: string; args: unknown }) => {
    if (input.name !== "query_notices")
      throw new Error("Tool is not allowed for logistics answers");
    const parsed = callSchema.safeParse(input);
    if (!parsed.success) throw new Error("Invalid logistics tool arguments");
    const matches = await deps.evidence.findVerifiedNotices({
      guildId: deps.guildId,
      topicKey: parsed.data.args.topicKey,
    });
    return { matchedCount: matches.length, notices: matches };
  };
}
