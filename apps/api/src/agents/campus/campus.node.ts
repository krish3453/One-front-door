import type { AgentStateType } from "../orchestrator/state.js";
import { campusAgent } from "./campus-agent.js";

export async function campusNode(state: AgentStateType) {
  const question = state.questions?.[0] ?? state.question;

  const result = await campusAgent.invoke({
    messages: [
      {
        role: "user",
        content: question,
      },
    ],
  });

  const messages = result.messages;
  const finalMessage = messages[messages.length - 1];

  const response =
    typeof finalMessage.content === "string"
      ? finalMessage.content
      : JSON.stringify(finalMessage.content);

  return {
    response,
  };
}