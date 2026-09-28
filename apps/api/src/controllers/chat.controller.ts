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
     * --------------------------------------------------
     * VALIDATE MESSAGE
     * --------------------------------------------------
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

    /*
     * --------------------------------------------------
     * GET AUTHENTICATED USER
     * --------------------------------------------------
     */

    if (!req.user) {

      res.status(401).json({
        error:
          "Authentication required.",
      });

      return;
    }

    const userId =
      req.user.id;

    const normalizedMessage =
      message.trim();

    console.log(
      `[API] REQUEST | user=${userId} | ip=${
        req.ip || "unknown"
      } | question="${normalizedMessage}"`
    );

    /*
     * --------------------------------------------------
     * PROCESS CHAT
     * --------------------------------------------------
     */

    const result =
      await processChat(
        {
          message:
            normalizedMessage,

          conversationId,
        },

        userId
      );

    /*
     * --------------------------------------------------
     * CACHE METRICS
     * --------------------------------------------------
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
          result.response.sources
            ?.length ?? 0
        } | latency=${
          result.latencyMs
        }ms`
      );

      res.setHeader(
        "X-Cache",
        "MISS"
      );
    }

    /*
     * --------------------------------------------------
     * RESPONSE LATENCY
     * --------------------------------------------------
     */

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

    /*
     * --------------------------------------------------
     * SEND RESPONSE
     * --------------------------------------------------
     */

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

    /*
     * Handle conversation-not-found
     * separately.
     */
    const statusCode =
      (
        error as {
          statusCode?: number;
        }
      ).statusCode;

    if (
      statusCode === 404
    ) {

      res.status(404).json({
        error:
          "Conversation not found.",
      });

      return;
    }

    res.status(500).json({
      error:
        "Failed to process chat request.",
    });
  }
}