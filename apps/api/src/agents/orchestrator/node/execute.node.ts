import type { AgentStateType } from "../state.js";

export async function executeNode(
  state: AgentStateType
) {
  switch (state.route) {
    case "academic":
      return {
        response:
          "Academic Agent selected. RAG and academic tools will handle this request.",
      };

    case "campus":
      return {
        response:
          "Campus Agent selected. Campus tools will handle this request.",
      };

    case "general":
      return {
        response:
          "General Agent selected. The general LLM agent will handle this request.",
      };

    default:
      return {
        response:
          "I could not determine which capability should handle this request.",
      };
  }
}