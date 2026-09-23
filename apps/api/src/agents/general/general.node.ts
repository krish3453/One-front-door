import type { AgentStateType } from "../orchestrator/state.js";
import { createLLM } from "../../llm/factory.js";

const llm = createLLM();

export async function generalNode(
  state: AgentStateType
) {
  const response = await llm.invoke([
    {
      role: "system",
      content: `
You are the General Agent for One Front Door,
a university AI assistant.

Answer general questions clearly and accurately.

Do not invent university-specific information.
If the question requires university-specific
information, explain that the appropriate
university agent should handle it.
      `,
    },
    {
      role: "user",
      content: state.question,
    },
  ]);

  return {
    response: response.content,
  };
}