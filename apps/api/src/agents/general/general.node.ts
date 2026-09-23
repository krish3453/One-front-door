import type { AgentStateType } from "../orchestrator/state.js";

export async function generalNode(state: AgentStateType) {
  return {
    response: `General Agent received: ${state.question}`,
  };
}