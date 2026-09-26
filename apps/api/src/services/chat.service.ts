import {
  getCachedResponse,
  setCachedResponse,
} from "../lib/cache.js";

import type {
  ChatRequest,
  ChatResponse,
  ChatMessage,
} from "@one-front-door/shared-types";

import { graph } from "../agents/orchestrator/graph.js";

export type ChatServiceResult = {
  response: ChatResponse;
  cached: boolean;
  latencyMs: number;
};

export async function processChat(
  request: ChatRequest
): Promise<ChatServiceResult> {
  const startTime = Date.now();

  const normalizedMessage =
    request.message.trim();

  /*
   * Check Redis cache first.
   */
  const cachedResponse =
    await getCachedResponse<ChatResponse>(
      normalizedMessage
    );

  if (cachedResponse) {
    return {
      response: cachedResponse,
      cached: true,
      latencyMs:
        Date.now() - startTime,
    };
  }

  /*
   * Cache MISS.
   *
   * Execute the LangGraph orchestration.
   */
  const result =
    await graph.invoke({
      question:
        normalizedMessage,
    });

  /*
   * Determine which agent handled
   * the request.
   */
  const agent =
    result.isMultiTopic
      ? "multi"
      : result.route;

  const responseMessage:
    ChatMessage = {
    id: crypto.randomUUID(),

    role: "assistant",

    content:
      result.response ??
      "I could not generate a response.",

    agent,

    createdAt:
      new Date().toISOString(),
  };

  /*
   * Remove duplicate sources.
   */
  const sources =
    Array.from(
      new Map(
        (result.sources ?? [])
          .map((source) => [
            `${source.source}|${
              source.page ?? ""
            }|${source.documentType}`,
            source,
          ])
      ).values()
    );

  const response:
    ChatResponse = {
    message:
      responseMessage,

    conversationId:
      request.conversationId ??
      crypto.randomUUID(),

    sources,
  };

  /*
   * Store response in Redis.
   */
  await setCachedResponse(
    normalizedMessage,
    response
  );

  return {
    response,
    cached: false,
    latencyMs:
      Date.now() - startTime,
  };
}