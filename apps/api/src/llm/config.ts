import "dotenv/config";

export type LLMProvider =
  | "google"
  | "openai"
  | "anthropic"
  | "groq";

export const llmConfig = {
  provider: (process.env.LLM_PROVIDER || "google") as LLMProvider,
  model: process.env.LLM_MODEL || "gemini-3.5-flash-lite",
};