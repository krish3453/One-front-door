import type {
  Request,
  Response,
} from "express";

import {
  getMetrics,
} from "../lib/metrics.js";

export function metricsController(
  _req: Request,
  res: Response
) {
  res.json(
    getMetrics()
  );
}