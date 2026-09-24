import { createLLM } from "../../../llm/factory.js";
import type { AgentStateType } from "../state.js";

const llm = createLLM();

export async function synthesizeNode(
  state: AgentStateType
) {
  // Single-topic request
  if (!state.questionResults?.length) {
    return {
      response: state.response,
    };
  }

  const formattedResults = state.questionResults
    .map(
      (result, index) =>
        `Question ${index + 1}: ${result.question}\n` +
        `Agent: ${result.route}\n` +
        `Answer: ${result.response}`
    )
    .join("\n\n");

  const response = await llm.invoke([
    {
      role: "system",
      content: `
You are the final response synthesizer for a university AI assistant.

Combine the answers provided by the specialized agents into one
clear response for the user.

Rules:
1. Preserve the factual information from the agent responses.
2. Do not invent additional information.
3. Answer every question.
4. Keep each answer clearly separated when there are multiple questions.
5. Do not mention internal agents, routing, orchestration, or tools.
6. Keep the response concise and natural.
`,
    },
    {
      role: "user",
      content: formattedResults,
    },
  ]);

  const content =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return {
    response: content,
  };
}