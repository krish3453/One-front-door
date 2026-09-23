import type { AgentStateType } from "../orchestrator/state.js";

export async function campusNode(state: AgentStateType) {
  return {
    response: `Campus Agent received: ${state.question}`,
  };
}