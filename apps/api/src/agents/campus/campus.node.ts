import type { AgentStateType } from "../orchestrator/state.js";

import { campusAgent } from "./campus-agent.js";

export async function campusNode(
  state: AgentStateType
) {
  console.log("\n[Campus Agent]");

  console.log(
    `[Campus Agent] Processing: ${state.question}`
  );

  /*
   * --------------------------------------------------
   * BUILD CONTEXT
   * --------------------------------------------------
   *
   * The analyzer should already resolve follow-up
   * questions such as:
   *
   * "Where is the library?"
   * "What's its timing?"
   *
   * into:
   *
   * "What are the timings of the Central Library?"
   *
   * We still provide recent conversation history
   * as additional context for safety.
   */

  const history =
    state.history?.slice(-10) ?? [];

  const historyText =
    history.length > 0
      ? history
          .map(
            (message) =>
              `${message.role}: ${message.content}`
          )
          .join("\n")
      : "No previous conversation.";

  const contextualQuestion = `
Recent conversation:
${historyText}

Current question:
${state.question}

Answer the current question using the university
knowledge available to you. If the current question
is a follow-up, use the conversation context to
understand what the user is referring to.

Do not invent university-specific information.
`;

  /*
   * --------------------------------------------------
   * CALL CAMPUS AGENT
   * --------------------------------------------------
   */

  const result =
    await campusAgent.invoke({
      messages: [
        {
          role: "user",
          content: contextualQuestion,
        },
      ],
    });

  /*
   * --------------------------------------------------
   * EXTRACT FINAL MESSAGE
   * --------------------------------------------------
   */

  const messages =
    result.messages ?? [];

  const finalMessage =
    messages[messages.length - 1];

  if (!finalMessage) {
    return {
      response:
        "I could not generate a campus-related response.",
      sources: [],
    };
  }

  const response =
    typeof finalMessage.content === "string"
      ? finalMessage.content
      : JSON.stringify(
          finalMessage.content
        );

  console.log(
    `[Campus Agent] Response generated`
  );

  return {
    response,
    sources: [],
  };
}