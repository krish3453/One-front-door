import crypto from "node:crypto";
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
  AgentExecutionStep,
  StreamEvent,
  ActionPayload,
} from "@one-front-door/shared-types";

import { graph } from "../agents/orchestrator/graph.js";
import { prisma } from "../lib/prisma.js";
import { tryExecuteActionTool } from "../agents/tools/action-dispatcher.js";

export type ChatServiceResult = {
  response: ChatResponse;
  cached: boolean;
  latencyMs: number;
};

export type StreamCallback = (event: StreamEvent) => void;

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

/**
 * Helper to emit a step and record it in the steps list
 */
function recordStep(
  steps: AgentExecutionStep[],
  onEvent: StreamCallback | undefined,
  step: Omit<AgentExecutionStep, "id">
): AgentExecutionStep {
  const fullStep: AgentExecutionStep = {
    ...step,
    id: `step-${steps.length + 1}-${Date.now()}`,
  };

  const existingIndex = steps.findIndex((s) => s.stage === step.stage);
  if (existingIndex >= 0) {
    steps[existingIndex] = fullStep;
  } else {
    steps.push(fullStep);
  }

  if (onEvent) {
    onEvent({ type: "step", step: fullStep });
  }

  return fullStep;
}

/*
 * --------------------------------------------------
 * PROCESS CHAT (STANDARD & STREAMING)
 * --------------------------------------------------
 */

export async function processChat(
  request: ChatRequest,
  userId: string
): Promise<ChatServiceResult> {
  return executeChatPipeline(request, userId);
}

export async function processChatStream(
  request: ChatRequest,
  userId: string,
  onEvent: StreamCallback
): Promise<ChatServiceResult> {
  return executeChatPipeline(request, userId, onEvent);
}

async function executeChatPipeline(
  request: ChatRequest,
  userId: string,
  onEvent?: StreamCallback
): Promise<ChatServiceResult> {
  const startTime = Date.now();
  const steps: AgentExecutionStep[] = [];

  const normalizedMessage = request.message.trim();

  if (!normalizedMessage) {
    throw new Error("Message cannot be empty.");
  }

  /*
   * ------------------------------------------------
   * 1. GET OR CREATE CONVERSATION
   * ------------------------------------------------
   */

  let conversationId = request.conversationId;

  if (conversationId) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      const error = new Error("Conversation not found.") as Error & {
        statusCode?: number;
      };
      error.statusCode = 404;
      throw error;
    }
  } else {
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title:
          normalizedMessage.length > 80
            ? `${normalizedMessage.slice(0, 77)}...`
            : normalizedMessage,
      },
    });

    conversationId = conversation.id;
  }

  if (!conversationId) {
    throw new Error("Conversation ID could not be created.");
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

    const previousMessages = await prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const history = previousMessages
      .filter(
        (message) =>
          message.role === "user" || message.role === "assistant"
      )
      .map((message) => ({
        role:
          message.role === "user"
            ? ("user" as const)
            : ("assistant" as const),
        content: message.content,
      }));

    /*
     * ------------------------------------------------
     * STEP 1: CACHE CHECK
     * ------------------------------------------------
     */
    const cacheStepStart = Date.now();
    recordStep(steps, onEvent, {
      stage: "cache_check",
      title: "Multi-Tier Redis Cache",
      description: "Checking global and session cache tiers...",
      status: "running",
    });

    const cacheHit = await getChatCache<ChatResponse>(
      normalizedMessage,
      conversationId,
      history.length
    );

    if (cacheHit) {
      const cachedResponse = cacheHit.data;
      const cacheDuration = Date.now() - cacheStepStart;

      recordStep(steps, onEvent, {
        stage: "cache_check",
        title: "Multi-Tier Redis Cache",
        description: `Cache HIT (${cacheDuration}ms) — Instant sub-second response`,
        status: "cached",
        durationMs: cacheDuration,
      });

      const cachedAgent = normalizeAgent(cachedResponse.message.agent);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: cachedResponse.message.content,
        ...(cachedAgent ? { agent: cachedAgent } : {}),
        createdAt: new Date().toISOString(),
        steps,
        actionData: cachedResponse.message.actionData,
      };

      await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: assistantMessage.content,
          agent: cachedAgent ?? null,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      const response: ChatResponse = {
        message: assistantMessage,
        conversationId,
        sources: cachedResponse.sources ?? [],
        steps,
        cached: true,
        latencyMs: Date.now() - startTime,
      };

      if (onEvent) {
        // Stream out cached content rapidly for immediate UI feel
        const words = cachedResponse.message.content.split(" ");
        for (let i = 0; i < words.length; i += 4) {
          const chunk = words.slice(i, i + 4).join(" ") + (i + 4 < words.length ? " " : "");
          onEvent({ type: "token", delta: chunk });
        }
        if (cachedResponse.sources?.length) {
          onEvent({ type: "sources", sources: cachedResponse.sources });
        }
        if (cachedResponse.message.actionData) {
          onEvent({ type: "action", actionData: cachedResponse.message.actionData });
        }
        onEvent({ type: "done", response });
      }

      return {
        response,
        cached: true,
        latencyMs: Date.now() - startTime,
      };
    }

    // Cache Miss
    recordStep(steps, onEvent, {
      stage: "cache_check",
      title: "Multi-Tier Redis Cache",
      description: "Cache MISS — Dispatching to LangGraph Orchestrator",
      status: "completed",
      durationMs: Date.now() - cacheStepStart,
    });

    /*
     * ------------------------------------------------
     * STEP 2: CHECK ACTION TOOLS (BUNK PLANNER / PETITION DRAFTER)
     * ------------------------------------------------
     */
    const actionResult = tryExecuteActionTool(normalizedMessage);
    let actionData: ActionPayload | undefined = undefined;

    if (actionResult.actionExecuted && actionResult.actionPayload) {
      actionData = actionResult.actionPayload;

      recordStep(steps, onEvent, {
        stage: "action_tool",
        title: actionData.title || "Campus Action Tool",
        description: `Executed deterministic action engine: ${actionResult.toolName}`,
        status: "completed",
        details: { tool: actionResult.toolName },
      });

      if (onEvent) {
        onEvent({ type: "action", actionData });
      }
    }

    /*
     * ------------------------------------------------
     * STEP 3: LANGGRAPH ORCHESTRATOR EXECUTION
     * ------------------------------------------------
     */
    const orchestratorStart = Date.now();
    recordStep(steps, onEvent, {
      stage: "analyzing",
      title: "LangGraph Orchestrator",
      description: "Analyzing query semantics, context, and multi-intent decomposition...",
      status: "running",
    });

    const result = await graph.invoke({
      question: normalizedMessage,
      userId,
      conversationId,
      history,
    });

    recordStep(steps, onEvent, {
      stage: "analyzing",
      title: "Query Analysis & Intent Classifier",
      description: result.isMultiTopic
        ? `Multi-topic query decomposed into ${result.questions?.length || 2} sub-tasks`
        : `Decomposed single query intent`,
      status: "completed",
      durationMs: Date.now() - orchestratorStart,
    });

    /*
     * ------------------------------------------------
     * STEP 4: AGENT ROUTING & RETRIEVAL
     * ------------------------------------------------
     */
    const agent: AgentType = result.isMultiTopic
      ? "multi"
      : normalizeAgent(result.route) ?? "general";

    recordStep(steps, onEvent, {
      stage: "routing",
      title: `Specialized Agent: ${agent.toUpperCase()}`,
      description: `Dispatched to ${agent} agent pipeline with university knowledge graph`,
      agent,
      status: "completed",
    });

    // Deduplicate and process sources
    const rawSources = (result.sources ?? []) as ChatSource[];
    const sources: ChatSource[] = Array.from(
      new Map<string, ChatSource>(
        rawSources.map((source): [string, ChatSource] => {
          const key = [source.source, source.page ?? "", source.documentType].join("|");
          return [key, source];
        })
      ).values()
    );

    if (sources.length > 0) {
      recordStep(steps, onEvent, {
        stage: "retrieval",
        title: "Qdrant Vector Retrieval",
        description: `Retrieved and grounded across ${sources.length} authoritative document chunk(s)`,
        status: "completed",
        details: { sourcesCount: sources.length },
      });

      if (onEvent) {
        onEvent({ type: "sources", sources });
      }
    }

    /*
     * ------------------------------------------------
     * STEP 5: SYNTHESIS & TOKEN STREAMING
     * ------------------------------------------------
     */
    const synthStart = Date.now();
    recordStep(steps, onEvent, {
      stage: "synthesizing",
      title: "Response Synthesis",
      description: "Synthesizing verified, cited answer from multi-agent context...",
      status: "running",
    });

    const responseContent = result.response ?? "I could not generate a response.";

    if (onEvent) {
      // Stream tokens smoothly to client
      const chunks = responseContent.match(/[\s\S]{1,16}/g) || [responseContent];
      for (const chunk of chunks) {
        onEvent({ type: "token", delta: chunk });
        // Tiny micro-yield for realistic stream feel
        await new Promise((r) => setTimeout(r, 8));
      }
    }

    recordStep(steps, onEvent, {
      stage: "synthesizing",
      title: "Response Synthesis",
      description: "Response synthesis complete with grounding",
      status: "completed",
      durationMs: Date.now() - synthStart,
    });

    /*
     * ------------------------------------------------
     * 6. BUILD FINAL RESPONSE & PERSIST
     * ------------------------------------------------
     */
    const responseMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: responseContent,
      agent,
      createdAt: new Date().toISOString(),
      steps,
      actionData,
    };

    const response: ChatResponse = {
      message: responseMessage,
      conversationId,
      sources,
      steps,
      cached: false,
      latencyMs: Date.now() - startTime,
    };

    await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: responseMessage.content,
        agent: agent,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    try {
      await saveChatCache(
        normalizedMessage,
        response,
        conversationId,
        history.length
      );
    } catch (cacheError) {
      console.error("[CHAT] Failed to cache response:", cacheError);
    }

    if (onEvent) {
      onEvent({ type: "done", response });
    }

    const latencyMs = Date.now() - startTime;
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
      console.log(`[CHAT] Rolled back dangling user message ${userMessage.id}`);
    } catch (cleanupError) {
      console.error("[CHAT] Failed to rollback user message:", cleanupError);
    }

    if (onEvent) {
      onEvent({
        type: "error",
        error: error instanceof Error ? error.message : "Failed to process chat request.",
      });
    }

    throw error;
  }
}