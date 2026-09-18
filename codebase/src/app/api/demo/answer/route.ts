import { z } from "zod";
import { answerLogistics } from "@/backend/assistant";
import { notices } from "@/backend/fixtures";
const requestSchema = z
  .object({ topicKey: z.string().min(1).max(80) })
  .strict();
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 4096)
    return Response.json({ error: "Request too large" }, { status: 413 });
  try {
    const raw = await request.text();
    if (raw.length > 4096)
      return Response.json({ error: "Request too large" }, { status: 413 });
    const parsed = requestSchema.safeParse(JSON.parse(raw));
    if (!parsed.success)
      return Response.json(
        { error: "Provide a valid topicKey" },
        { status: 400 },
      );
    return Response.json(
      answerLogistics(
        { guildId: "demo", topicKey: parsed.data.topicKey, confidence: 1 },
        notices,
      ),
    );
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
