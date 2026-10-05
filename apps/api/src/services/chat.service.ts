import {
  getChatCache,
  saveChatCache,
} from "../lib/cache.js";

import type {
  ChatRequest,
  ChatResponse,
  ChatMessage,
  ChatSource,
  AgentType,
} from "@one-front-door/shared-types";

import { graph } from "../agents/orchestrator/graph.js";
import { prisma } from "../lib/prisma.js";

export type ChatServiceResult = {
  response: ChatResponse;
  cached: boolean;
  latencyMs: number;
};

/*
 * --------------------------------------------------
 * VALID AGENT TYPES
 * --------------------------------------------------
 */

function normalizeAgent(
  agent: unknown
): AgentType | undefined {
  if (
    agent === "academic" ||
    agent === "campus" ||
    agent === "general" ||
    agent === "multi"
  ) {
    return agent;
  }

  return undefined;
}



/*
 * --------------------------------------------------
 * PROCESS CHAT
 * --------------------------------------------------
 */

export async function processChat(
  request: ChatRequest,
  userId: string
): Promise<ChatServiceResult> {

  const startTime = Date.now();

  const normalizedMessage =
    request.message.trim();

  if (!normalizedMessage) {
    throw new Error(
      "Message cannot be empty."
    );
  }

  /*
   * ------------------------------------------------
   * 1. GET OR CREATE CONVERSATION
   * ------------------------------------------------
   */

  let conversationId =
    request.conversationId;

  if (conversationId) {

    const conversation =
      await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
      });

    if (!conversation) {
      const error =
        new Error(
          "Conversation not found."
        ) as Error & {
          statusCode?: number;
        };

      error.statusCode = 404;

      throw error;
    }

  } else {

    const conversation =
      await prisma.conversation.create({
        data: {
          userId,

          title:
            normalizedMessage.length > 80
              ? `${normalizedMessage.slice(
                  0,
                  77
                )}...`
              : normalizedMessage,
        },
      });

    conversationId =
      conversation.id;
  }

  if (!conversationId) {
    throw new Error(
      "Conversation ID could not be created."
    );
  }

  /*
   * ------------------------------------------------
   * 2. SAVE USER MESSAGE
   * ------------------------------------------------
   */
  const userMessage = await prisma.message.create({
    data: {
      conversationId,
      role: "user",
      content: normalizedMessage,
    },
  });

  try {
  /*
   * ------------------------------------------------
   * 3. LOAD CONVERSATION HISTORY
   * ------------------------------------------------
   */

  const previousMessages =
    await prisma.message.findMany({
      where: {
        conversationId,
      },

      orderBy: {
        createdAt: "asc",
      },
    });

  const history =
    previousMessages
      .filter(
        (message) =>
          message.role === "user" ||
          message.role === "assistant"
      )
      .map(
        (message) => ({
          role:
            message.role === "user"
              ? ("user" as const)
              : ("assistant" as const),

          content:
            message.content,
        })
      );

  console.log(
    `[MEMORY] conversation=${conversationId}`
  );

  console.log(
    `[MEMORY] Database messages=${previousMessages.length}`
  );

  console.log(
    "[MEMORY] History being sent to LangGraph:",
    history
  );

  /*
   * ------------------------------------------------
   * 4. CHECK MULTI-TIER REDIS CACHE
   * ------------------------------------------------
   */

  const cacheHit =
    await getChatCache<ChatResponse>(
      normalizedMessage,
      conversationId,
      history.length
    );

  if (cacheHit) {
    const cachedResponse = cacheHit.data;

    console.log(
      `[CHAT] Cache HIT | key=${cacheHit.key}`
    );

    /*
     * IMPORTANT:
     *
     * Never reuse the cached assistant
     * message ID.
     */

    const cachedAgent =
      normalizeAgent(
        cachedResponse.message.agent
      );

    const assistantMessage:
      ChatMessage = {

      id:
        crypto.randomUUID(),

      role:
        "assistant",

      content:
        cachedResponse.message.content,

      ...(cachedAgent
        ? {
            agent: cachedAgent,
          }
        : {}),

      createdAt:
        new Date().toISOString(),
    };

    /*
     * Save cached response into this
     * conversation.
     */

    await prisma.message.create({
      data: {
        conversationId,

        role:
          "assistant",

        content:
          assistantMessage.content,

        agent:
          cachedAgent ?? null,
      },
    });

    /*
     * Touch conversation.
     */

    await prisma.conversation.update({
      where: {
        id: conversationId,
      },

      data: {
        updatedAt: new Date(),
      },
    });

    const response:
      ChatResponse = {

      message:
        assistantMessage,

      conversationId,

      sources:
        cachedResponse.sources ?? [],
    };

    console.log(
      `[CHAT] Cache HIT | agent=${
        cachedAgent ?? "undefined"
      }`
    );

    return {
      response,

      cached: true,

      latencyMs:
        Date.now() -
        startTime,
    };
  }

  /*
   * ------------------------------------------------
   * 6. CACHE MISS -> LANGGRAPH
   * ------------------------------------------------
   */

  console.log(
    "[CHAT] Cache MISS"
  );

  const result =
    await graph.invoke({

      question:
        normalizedMessage,

      userId,

      conversationId,

      history,
    });

  /*
   * ------------------------------------------------
   * 7. DETERMINE AGENT
   * ------------------------------------------------
   */

  const agent: AgentType =
    result.isMultiTopic
      ? "multi"
      : normalizeAgent(result.route) ??
        "general";

  console.log(
    `[CHAT] Agent=${agent}`
  );

  /*
   * ------------------------------------------------
   * 8. BUILD ASSISTANT MESSAGE
   * ------------------------------------------------
   */

  const responseMessage:
    ChatMessage = {

    id:
      crypto.randomUUID(),

    role:
      "assistant",

    content:
      result.response ??
      "I could not generate a response.",

    agent,

    createdAt:
      new Date().toISOString(),
  };

  /*
   * ------------------------------------------------
   * 9. NORMALIZE + DEDUPLICATE SOURCES
   * ------------------------------------------------
   */

  const rawSources =
    (result.sources ?? []) as ChatSource[];

  const sources: ChatSource[] =
    Array.from(
      new Map<string, ChatSource>(
        rawSources.map(
          (
            source
          ): [string, ChatSource] => {

            const key =
              [
                source.source,
                source.page ?? "",
                source.documentType,
              ].join("|");

            return [
              key,
              source,
            ];
          }
        )
      ).values()
    );

  console.log(
    `[CHAT] Sources=${sources.length}`
  );

  /*
   * ------------------------------------------------
   * 10. BUILD FINAL RESPONSE
   * ------------------------------------------------
   */

  const response:
    ChatResponse = {

    message:
      responseMessage,

    conversationId,

    sources,
  };

  /*
   * ------------------------------------------------
   * 11. SAVE ASSISTANT MESSAGE
   * ------------------------------------------------
   */

  await prisma.message.create({
    data: {

      conversationId,

      role:
        "assistant",

      content:
        responseMessage.content,

      agent:
        agent,
    },
  });

  /*
   * ------------------------------------------------
   * 12. UPDATE CONVERSATION TIMESTAMP
   * ------------------------------------------------
   */

  await prisma.conversation.update({
    where: {
      id: conversationId,
    },

    data: {
      updatedAt: new Date(),
    },
  });

  /*
   * ------------------------------------------------
   * 13. SAVE TO REDIS
   * ------------------------------------------------
   */

  try {
    await saveChatCache(
      normalizedMessage,
      response,
      conversationId,
      history.length
    );

    console.log(
      `[CHAT] Response cached for "${normalizedMessage}" (conv=${conversationId})`
    );

  } catch (error) {

    /*
     * Redis failure should NOT make
     * the chat request fail.
     */

    console.error(
      "[CHAT] Failed to cache response:",
      error
    );
  }

  /*
   * ------------------------------------------------
   * 14. RETURN
   * ------------------------------------------------
   */

  const latencyMs =
    Date.now() -
    startTime;

  console.log(
    `[CHAT] Completed | conversation=${conversationId} | cached=false | latency=${latencyMs}ms`
  );

    return {
      response,
      cached: false,
      latencyMs,
    };
  } catch (error) {
    try {
      await prisma.message.delete({
        where: { id: userMessage.id },
      });
      console.log(
        `[CHAT] Rolled back dangling user message ${userMessage.id} due to failure`
      );
    } catch (cleanupError) {
      console.error(
        "[CHAT] Failed to rollback dangling user message:",
        cleanupError
      );
    }
    throw error;
  }
}