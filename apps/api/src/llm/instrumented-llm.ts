import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { BaseMessage } from "@langchain/core/messages";

import {
  extractTokenUsage,
  recordLLMUsage,
} from "./observability.js";

export function instrumentLLM(
  llm: BaseChatModel,
  provider: string,
  model: string,
  operation: string = "unknown"
): BaseChatModel {
  const originalInvoke =
    llm.invoke.bind(llm);

  llm.invoke = async (
    input: BaseMessage[] | string,
    options?: any
  ) => {
    const start = Date.now();

    try {
      const response =
        await originalInvoke(
          input as any,
          options
        );

      const latency =
        Date.now() - start;

      const usage =
        extractTokenUsage(
          response
        );

      recordLLMUsage({
        provider,
        model,
        operation,

        inputTokens:
          usage.inputTokens,

        outputTokens:
          usage.outputTokens,

        totalTokens:
          usage.totalTokens,

        latencyMs:
          latency,
      });

      return response;
    } catch (error) {
      const latency =
        Date.now() - start;

      console.error(
        `[LLM ERROR] ${provider}/${model} | ` +
          `operation=${operation} | ` +
          `latency=${latency}ms`,
        error
      );

      throw error;
    }
  };

  return llm;
}