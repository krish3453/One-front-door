import type { AgentStateType } from "../orchestrator/state.js";

export async function academicNode(state: AgentStateType) {
  return {
    response: `Academic Agent received: ${state.question}`,
  };
}