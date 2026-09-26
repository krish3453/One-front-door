import type {
  Request,
  Response,
} from "express";

import {
  getMetrics,
} from "../lib/metrics.js";

import {
  getLLMMetrics,
} from "../llm/observability.js";

export function metricsController(
  _req: Request,
  res: Response
) {
  res.json({
    api: getMetrics(),
    llm: getLLMMetrics(),
  });
}