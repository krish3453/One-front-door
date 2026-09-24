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
  response: z.string().optional(),
  sources: z.array(SourceSchema).optional(),
});

export const AgentState = new StateSchema({
  // Original user question
  question: z.string(),

  // Questions extracted by the analyzer
  questions: z.array(z.string()).optional(),

  // Whether the query contains multiple independent questions
  isMultiTopic: z.boolean().optional(),

  // Route for a single-topic query
  route: RouteSchema.optional(),

  // Final combined response
  response: z.string().optional(),

  // Sources used by agents
  sources: z.array(SourceSchema).optional(),

  // Results for each question in a multi-topic query
  questionResults: z.array(QuestionResultSchema).optional(),
});

export type AgentStateType =
  typeof AgentState.State;