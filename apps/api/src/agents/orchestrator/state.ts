import { StateSchema } from "@langchain/langgraph";
import { z } from "zod";

export const RouteSchema = z.enum([
  "academic",
  "campus",
  "general",
]);

export const AgentState = new StateSchema({
  question: z.string(),

  route: RouteSchema.optional(),

  response: z.string().optional(),
});

export type AgentStateType = typeof AgentState.State;