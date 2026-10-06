
import type { Request, Response } from "express";
import type { ChatRequest, StreamEvent } from "@one-front-door/shared-types";
import { processChat, processChatStream } from "../services/chat.service.js";
import {
  recordRequest,
  recordCacheHit,
  recordCacheMiss,
  recordError,
  recordLatency,
} from "../lib/metrics.js";

/*
 * --------------------------------------------------
 * STANDARD CHAT CONTROLLER (REST)
 * --------------------------------------------------
 */

export async function chatController(req: Request, res: Response) {
  const requestStart = Date.now();
  recordRequest();

  try {
    const { message, conversationId } = req.body as ChatRequest;

    if (typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: "Message is required." });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const userId = req.user.id;
    const normalizedMessage = message.trim();

    console.log(`[API] REQUEST | user=${userId} | question="${normalizedMessage}"`);

    const result = await processChat(
      { message: normalizedMessage, conversationId },
      userId
    );

    if (result.cached) {
      recordCacheHit();
      res.setHeader("X-Cache", "HIT");
    } else {
      recordCacheMiss();
      res.setHeader("X-Cache", "MISS");
    }

    const totalLatency = Date.now() - requestStart;
    recordLatency(totalLatency);
    res.setHeader("X-Response-Time", `${totalLatency}ms`);

    res.json(result.response);
  } catch (error) {
    const latency = Date.now() - requestStart;
    recordError();
    recordLatency(latency);
    console.error(`[API] ERROR | latency=${latency}ms`, error);

    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }

    res.status(500).json({ error: "Failed to process chat request." });
  }
}

/*
 * --------------------------------------------------
 * SSE STREAMING CHAT CONTROLLER
 * --------------------------------------------------
 */

export async function chatStreamController(req: Request, res: Response) {
  const requestStart = Date.now();
  recordRequest();

  const { message, conversationId } = req.body as ChatRequest;

  if (typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message is required." });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const userId = req.user.id;
  const normalizedMessage = message.trim();

  // Set SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const sendEvent = (event: StreamEvent) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
    } catch (err) {
      console.error("[SSE] Error writing stream event:", err);
    }
  };

  try {
    console.log(`[API-STREAM] START | user=${userId} | question="${normalizedMessage}"`);

    const result = await processChatStream(
      { message: normalizedMessage, conversationId },
      userId,
      sendEvent
    );

    if (result.cached) {
      recordCacheHit();
    } else {
      recordCacheMiss();
    }

    const totalLatency = Date.now() - requestStart;
    recordLatency(totalLatency);
    console.log(`[API-STREAM] DONE | latency=${totalLatency}ms`);

    res.end();
  } catch (error) {
    const latency = Date.now() - requestStart;
    recordError();
    recordLatency(latency);
    console.error(`[API-STREAM] ERROR | latency=${latency}ms`, error);

    sendEvent({
      type: "error",
      error: error instanceof Error ? error.message : "Failed to process streaming request.",
    });

    res.end();
  }
}