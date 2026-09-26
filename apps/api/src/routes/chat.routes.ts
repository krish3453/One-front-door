import {
  Router,
} from "express";

import {
  chatController,
} from "../controllers/chat.controller.js";

import {
  rateLimitMiddleware,
} from "../middleware/rate-limit.middleware.js";

const router =
  Router();

router.post(
  "/chat",
  rateLimitMiddleware,
  chatController
);

export default router;