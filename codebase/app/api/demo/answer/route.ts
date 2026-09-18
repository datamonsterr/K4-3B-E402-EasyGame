import { createAnswerHandler } from "./handler";
import { openAnswerContext } from "@/backend/assistant/logistics/composition";

export const POST = createAnswerHandler({ openContext: openAnswerContext });
