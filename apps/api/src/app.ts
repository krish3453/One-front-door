import express from "express";
import cors from "cors";

import chatRoutes from "./routes/chat.routes.js";
import healthRoutes from "./routes/health.routes.js";
import metricsRoutes from "./routes/metrics.routes.js";
import session from "express-session";
import passport from "./auth/google.strategy.js";
import authRouter from "./auth/auth.routes.js";


const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ??
      "development-secret-change-me",

    resave: false,

    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge:
        1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use("/api/auth", authRouter);

app.use(
  express.json()
);

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

export default app;