import { generateText } from "ai";
import { createLlmHealthHandler } from "./handler";
import { createAgentModelFromEnvironment } from "@/backend/assistant/agent/models";
import { sessionClient } from "@/backend/database/client";

export const POST = createLlmHealthHandler({
  async authorize() {
    try {
      const client = await sessionClient();
      const {
        data: { user },
        error,
      } = await client.auth.getUser();
      return Boolean(user && !error);
    } catch {
      return false;
    }
  },
  resolveModel: createAgentModelFromEnvironment,
  async probe(config) {
    await generateText({
      model: config.model,
      prompt: "Reply with OK.",
      maxOutputTokens: 4,
    });
  },
});
