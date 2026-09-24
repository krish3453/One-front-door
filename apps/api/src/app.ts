import express from "express";
import cors from "cors";

import type {
  ChatRequest,
  ChatResponse,
  ChatMessage,
} from "@one-front-door/shared-types";

import { graph } from "./agents/orchestrator/graph.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get(
  "/api/health",
  (_req, res) => {
    res.json({
      status: "ok",
      service:
        "one-front-door-api",
    });
  }
);

app.post(
  "/api/chat",
  async (req, res) => {
    try {
      const {
        message,
        conversationId,
      } =
        req.body as ChatRequest;

      if (
        typeof message !== "string" ||
        message.trim().length === 0
      ) {
        res.status(400).json({
          error:
            "Message is required.",
        });

        return;
      }

      const result =
        await graph.invoke({
          question:
            message.trim(),
        });

      /*
       * Determine what should be displayed
       * as the source agent in the UI.
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
          conversationId ??
          crypto.randomUUID(),

        sources,
      };

      res.json(response);
    } catch (error) {
      console.error(
        "Chat request failed:",
        error
      );

      res.status(500).json({
        error:
          "Failed to process chat request.",
      });
    }
  }
);

export default app;