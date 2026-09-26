import express from "express";
import cors from "cors";

import chatRoutes from "./routes/chat.routes.js";
import healthRoutes from "./routes/health.routes.js";
import metricsRoutes from "./routes/metrics.routes.js";

const app = express();

app.use(cors());

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