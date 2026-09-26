import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { checkRateLimit } from "../lib/rate-limit.js";

import {
  recordRateLimited,
} from "../lib/metrics.js";

export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const identifier =
    req.ip || "unknown";

  try {
    const rateLimit =
      await checkRateLimit(
        identifier
      );

    res.setHeader(
      "X-RateLimit-Limit",
      String(
        Number(
          process.env.RATE_LIMIT_MAX_REQUESTS ??
            20
        )
      )
    );

    res.setHeader(
      "X-RateLimit-Remaining",
      String(
        rateLimit.remaining
      )
    );

    if (!rateLimit.allowed) {
      recordRateLimited();

      res.setHeader(
        "Retry-After",
        String(
          rateLimit.retryAfter
        )
      );

      console.log(
        `[API] RATE_LIMITED | ip=${identifier}`
      );

      res.status(429).json({
        error:
          "Too many requests. Please try again later.",

        retryAfter:
          rateLimit.retryAfter,
      });

      return;
    }

    next();
  } catch (error) {
    console.error(
      "[RateLimit] Failed:",
      error
    );

    /*
     * Fail open.
     *
     * If Redis temporarily fails, don't
     * take down the entire chat API.
     */
    next();
  }
}