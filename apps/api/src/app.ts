import express from "express";
import cors from "cors";
import session from "express-session";
import { RedisStore } from "connect-redis";

import { sessionRedisClient } from "./lib/redis.js";
import passport from "./auth/google.strategy.js";
import authRouter from "./auth/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import healthRoutes from "./routes/health.routes.js";
import metricsRoutes from "./routes/metrics.routes.js";

const app = express();

app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Return the requesting origin so Access-Control-Allow-Credentials: true is accepted by all browsers
      if (!origin) return callback(null, true);
      return callback(null, origin);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  session({
    store: new RedisStore({
      client: sessionRedisClient,
      prefix: "sess:",
    }),
    secret:
      process.env.SESSION_SECRET ??
      "development-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use("/api/auth", authRouter);

app.get("/", (_req, res) => {
  res.json({
    name: "One Front Door API",
    status: "online",
    health: "/api/health",
    frontend: process.env.FRONTEND_URL || "http://localhost:5173",
    endpoints: ["/api/auth", "/api/chat", "/api/conversations", "/api/health", "/api/metrics"],
  });
});

/*
 * API routes
 */
app.use(
  "/api",
  healthRoutes
);

app.use(
  "/api",
  metricsRoutes
);

app.use(
  "/api",
  chatRoutes
);

app.use(
  "/api",
  conversationRoutes
);

export default app;