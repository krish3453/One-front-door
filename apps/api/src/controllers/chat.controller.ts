import type {
  Request,
  Response,
} from "express";

import type {
  ChatRequest,
} from "@one-front-door/shared-types";

import {
  processChat,
} from "../services/chat.service.js";

import {
  recordRequest,
  recordCacheHit,
  recordCacheMiss,
  recordError,
  recordLatency,
} from "../lib/metrics.js";

export async function chatController(
  req: Request,
  res: Response
) {
  const requestStart =
    Date.now();

  recordRequest();

  try {
    const {
      message,
      conversationId,
    } =
      req.body as ChatRequest;

    /*
     * Validate request.
     */
    if (
      typeof message !==
        "string" ||
      message.trim().length === 0
    ) {
      console.log(
        "[API] BAD_REQUEST | message missing"
      );

      res.status(400).json({
        error:
          "Message is required.",
      });

      return;
    }

    const normalizedMessage =
      message.trim();

    console.log(
      `[API] REQUEST | ip=${
        req.ip || "unknown"
      } | question="${normalizedMessage}"`
    );

    const result =
      await processChat({
        message:
          normalizedMessage,

        conversationId,
      });

    /*
     * Record cache metrics.
     */
    if (result.cached) {
      recordCacheHit();

      console.log(
        `[API] CACHE_HIT | latency=${result.latencyMs}ms`
      );

      res.setHeader(
        "X-Cache",
        "HIT"
      );
    } else {
      recordCacheMiss();

      console.log(
        "[API] CACHE_MISS | executing graph"
      );

      console.log(
        `[API] RESPONSE | route=${
          result.response.message.agent ??
          "unknown"
        } | sources=${
          result.response.sources?.length ??
          0
        } | latency=${
          result.latencyMs
        }ms`
      );

      res.setHeader(
        "X-Cache",
        "MISS"
      );
    }

    const totalLatency =
      Date.now() -
      requestStart;

    recordLatency(
      totalLatency
    );

    res.setHeader(
      "X-Response-Time",
      `${totalLatency}ms`
    );

    res.json(
      result.response
    );
  } catch (error) {
    const latency =
      Date.now() -
      requestStart;

    recordError();

    recordLatency(
      latency
    );

    console.error(
      `[API] ERROR | latency=${latency}ms`,
      error
    );

    res.status(500).json({
      error:
        "Failed to process chat request.",
    });
  }
}