import type { AgentStateType } from "../state.js";

export function routeByAgent(state: AgentStateType) {
  switch (state.route) {
    case "academic":
      return "academic";

    case "campus":
      return "campus";

    case "general":
      return "general";

    default:
      throw new Error("No valid route selected");
  }
}