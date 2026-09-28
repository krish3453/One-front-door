import { StateSchema } from "@langchain/langgraph";
import { z } from "zod";

/*
 * --------------------------------------------------
 * ROUTES
 * --------------------------------------------------
 */

export const RouteSchema = z.enum([
  "academic",
  "campus",
  "general",
]);

/*
 * --------------------------------------------------
 * CONVERSATION MESSAGE
 * --------------------------------------------------
 */

export const ConversationMessageSchema =
  z.object({
    role: z.enum([
      "user",
      "assistant",
    ]),

    content: z.string(),
  });

/*
 * --------------------------------------------------
 * SOURCES
 * --------------------------------------------------
 */

export const SourceSchema = z.object({
  source: z.string(),

  page:
    z.number().optional(),

  documentType:
    z.string(),
});

/*
 * --------------------------------------------------
 * QUESTION RESULT
 * --------------------------------------------------
 */

export const QuestionResultSchema =
  z.object({
    question: z.string(),

    route: RouteSchema,

    response: z.string(),

    sources:
      z.array(
        SourceSchema
      ),
  });

/*
 * --------------------------------------------------
 * AGENT STATE
 * --------------------------------------------------
 */

export const AgentState =
  new StateSchema({

    /*
     * Original current user question.
     */
    question:
      z.string(),

    /*
     * Authenticated user.
     */
    userId:
      z.string(),

    /*
     * Current conversation.
     */
    conversationId:
      z.string().optional(),

    /*
     * Previous conversation messages.
     */
    history:
      z.array(
        ConversationMessageSchema
      ).optional(),

    /*
     * Multi-topic analysis.
     */
    questions:
      z.array(
        z.string()
      ).optional(),

    isMultiTopic:
      z.boolean().optional(),

    /*
     * Classification.
     */
    route:
      RouteSchema.optional(),

    /*
     * Final response.
     */
    response:
      z.string().optional(),

    /*
     * RAG sources.
     */
    sources:
      z.array(
        SourceSchema
      ).optional(),

    /*
     * Individual question results.
     */
    questionResults:
      z.array(
        QuestionResultSchema
      ).optional(),
  });

export type AgentStateType =
  typeof AgentState.State;