import type { AgentStateType } from "../state.js";

export async function classifyNode(
  state: AgentStateType
) {
  const question = state.question.toLowerCase();

  let route: "academic" | "campus" | "general";

  if (
    question.includes("course") ||
    question.includes("attendance") ||
    question.includes("exam") ||
    question.includes("subject") ||
    question.includes("semester") ||
    question.includes("grade")
  ) {
    route = "academic";
  } else if (
    question.includes("library") ||
    question.includes("campus") ||
    question.includes("event") ||
    question.includes("club") ||
    question.includes("facility")
  ) {
    route = "campus";
  } else {
    route = "general";
  }

  return {
    route,
  };
}