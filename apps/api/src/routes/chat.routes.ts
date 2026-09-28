import { Router } from "express";

import { chatController } from "../controllers/chat.controller.js";

import {
  rateLimitMiddleware,
} from "../middleware/rate-limit.middleware.js";

import {
  requireAuth,
} from "../auth/auth.middleware.js";

const router = Router();

router.post(
  "/chat",
  requireAuth,
  rateLimitMiddleware,
  chatController
);

export default router;