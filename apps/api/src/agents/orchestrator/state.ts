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

export const QuestionResultSchema = z.object({
  question: z.string(),
  route: RouteSchema,
  response: z.string(),
  sources: z.array(SourceSchema),
});

export const AgentState = new StateSchema({
  question: z.string(),

  questions: z.array(z.string()).optional(),

  isMultiTopic: z.boolean().optional(),

  route: RouteSchema.optional(),

  response: z.string().optional(),

  sources: z.array(SourceSchema).optional(),

  questionResults:
    z.array(QuestionResultSchema).optional(),
});

export type AgentStateType =
  typeof AgentState.State;