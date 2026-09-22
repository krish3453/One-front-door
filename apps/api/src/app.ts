import express from "express";
import cors from "cors";
import type { ChatRequest } from "@one-front-door/shared-types";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "one-front-door-api",
  });
});

export default app;