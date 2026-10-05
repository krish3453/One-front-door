import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { BaseMessage } from "@langchain/core/messages";

import {
  extractTokenUsage,
  recordLLMUsage,
} from "./observability.js";

/*
 * --------------------------------------------------
 * RATE LIMIT RETRY CONFIGURATION
 * --------------------------------------------------
 *
 * The free tier of gemini-3.5-flash-lite allows only
 * 15 requests per minute. The orchestrator pipeline
 * (analyze → classify → agent → synthesize) can use
 * 4-7 calls per user message, so 429 errors are common.
 *
 * We retry with escalating backoff delays.
 */

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [10_000, 30_000, 60_000];

function isRateLimitError(error: any): boolean {
  return (
    error?.status === 429 ||
    error?.statusCode === 429 ||
    error?.message?.includes("429") ||
    error?.message?.includes("Too Many Requests") ||
    error?.message?.includes("quota")
  );
}

function extractRetryDelay(error: any): number | undefined {
  // Google API errors include retryDelay like "43s"
  const details = error?.errorDetails;
  if (Array.isArray(details)) {
    for (const detail of details) {
      if (detail?.retryDelay) {
        const match = String(detail.retryDelay).match(/(\d+)/);
        if (match) return parseInt(match[1], 10) * 1000;
      }
    }
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    let lastError: any;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
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
      } catch (error: any) {
        const latency =
          Date.now() - start;

        lastError = error;

        if (isRateLimitError(error) && attempt < MAX_RETRIES) {
          const apiDelay = extractRetryDelay(error);
          const backoffDelay = RETRY_DELAYS_MS[attempt] ?? 60_000;
          const waitMs = apiDelay ?? backoffDelay;

          console.warn(
            `[LLM RATE LIMIT] ${provider}/${model} | ` +
              `operation=${operation} | ` +
              `attempt=${attempt + 1}/${MAX_RETRIES} | ` +
              `retrying in ${Math.round(waitMs / 1000)}s`
          );

          await sleep(waitMs);
          continue;
        }

        console.error(
          `[LLM ERROR] ${provider}/${model} | ` +
            `operation=${operation} | ` +
            `latency=${latency}ms`,
          error
        );

        throw error;
      }
    }

    throw lastError;
  };

  return llm;
}