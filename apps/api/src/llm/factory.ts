import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";

import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

import { llmConfig } from "./config.js";
import { instrumentLLM } from "./instrumented-llm.js";

export function createLLM(
  operation: string = "unknown"
): BaseChatModel {
  switch (llmConfig.provider) {
    case "google": {
      const llm =
        new ChatGoogleGenerativeAI({
          model: llmConfig.model,
          temperature: 0,
          apiKey:
            process.env.GOOGLE_API_KEY,
        });

      return instrumentLLM(
        llm,
        "google",
        llmConfig.model,
        operation
      );
    }

    case "groq": {
      const llm =
        new ChatGroq({
          model: llmConfig.model,
          temperature: 0,
          apiKey:
            process.env.GROQ_API_KEY,
        });

      return instrumentLLM(
        llm,
        "groq",
        llmConfig.model,
        operation
      );
    }

    case "openai":
      throw new Error(
        "OpenAI provider is not installed yet."
      );

    case "anthropic":
      throw new Error(
        "Anthropic provider is not installed yet."
      );

    default:
      throw new Error(
        `Unsupported LLM provider: ${llmConfig.provider}`
      );
  }
}