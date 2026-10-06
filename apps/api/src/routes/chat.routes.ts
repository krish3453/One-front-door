import { Router } from "express";

import { chatController, chatStreamController } from "../controllers/chat.controller.js";

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

router.post(
  "/chat/stream",
  requireAuth,
  rateLimitMiddleware,
  chatStreamController
);

export default router;