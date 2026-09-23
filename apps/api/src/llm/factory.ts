import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

import { llmConfig } from "./config.js";

export function createLLM(): BaseChatModel {
  switch (llmConfig.provider) {
    case "google":
      return new ChatGoogleGenerativeAI({
        model: llmConfig.model,
        temperature: 0,
        apiKey: process.env.GOOGLE_API_KEY,
      });

    case "groq":
        console.log("Using Groq LLM provider with model:", llmConfig.model);
      return new ChatGroq({
        model: llmConfig.model,
        temperature: 0,
        apiKey: process.env.GROQ_API_KEY,
      });

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