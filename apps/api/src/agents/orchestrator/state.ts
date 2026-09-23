import { StateSchema } from "@langchain/langgraph";
import { z } from "zod";

export const RouteSchema = z.enum([
  "academic",
  "campus",
  "general",
]);

export const SourceSchema = z.object({
  source: z.string(),
  page: z.number().optional(),
  documentType: z.string(),
});

export const AgentState = new StateSchema({
  question: z.string(),

  route: RouteSchema.optional(),

  response: z.string().optional(),

  sources: z
    .array(SourceSchema)
    .optional(),
});

export type AgentStateType =
  typeof AgentState.State;