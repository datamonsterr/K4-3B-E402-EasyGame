import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

export type AgentProvider = "gemini" | "openrouter";

export type ModelConfigInput = {
  provider: AgentProvider;
  apiKey: string;
  model?: string;
};

export type ResolvedModelConfig = {
  provider: AgentProvider;
  apiKey: string;
  modelId: string;
};

export type ConfiguredAgentModel = {
  provider: AgentProvider;
  modelId: string;
  model: Exclude<LanguageModel, string>;
};

export function resolveModelConfig(
  input: ModelConfigInput,
): ResolvedModelConfig {
  const apiKey = input.apiKey.trim();
  if (!apiKey) throw new Error(`${input.provider} API key is required`);

  return {
    provider: input.provider,
    apiKey,
    modelId:
      input.model?.trim() ||
      (input.provider === "gemini"
        ? "gemini-3.5-flash-lite"
        : "google/gemini-3.5-flash-lite"),
  };
}

export function createAgentModel(
  input: ModelConfigInput,
): ConfiguredAgentModel {
  const config = resolveModelConfig(input);
  const model =
    config.provider === "gemini"
      ? createGoogleGenerativeAI({ apiKey: config.apiKey })(config.modelId)
      : createOpenRouter({
          apiKey: config.apiKey,
          compatibility: "strict",
          appName: "EasyGame",
        }).chat(config.modelId);

  return { provider: config.provider, modelId: config.modelId, model };
}

export function createAgentModelFromEnvironment(): ConfiguredAgentModel | null {
  const provider =
    process.env.AI_PROVIDER === "openrouter" ? "openrouter" : "gemini";
  const apiKey =
    provider === "gemini"
      ? process.env.GEMINI_API_KEY
      : process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  return createAgentModel({
    provider,
    apiKey,
    model:
      provider === "gemini"
        ? process.env.GEMINI_MODEL
        : process.env.OPENROUTER_MODEL,
  });
}
