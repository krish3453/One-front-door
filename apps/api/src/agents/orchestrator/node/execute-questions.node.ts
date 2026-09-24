import type { AgentStateType } from "../state.js";

import { classifyNode } from "./classify.node.js";

import { academicNode } from "../../academic/academic.node.js";
import { campusNode } from "../../campus/campus.node.js";
import { generalNode } from "../../general/general.node.js";

export async function executeQuestionsNode(
  state: AgentStateType
) {
  const questions =
    state.questions?.length
      ? state.questions
      : [state.question];

  const results = [];

  for (const question of questions) {
    console.log(
      `\n[Orchestrator] Processing: ${question}`
    );

    const classification =
      await classifyNode({
        ...state,
        question,
      });

    const route = classification.route;

    if (!route) {
      throw new Error(
        `Could not determine route for question: ${question}`
      );
    }

    console.log(
      `[Orchestrator] Route: ${route}`
    );

    let agentResult;

    switch (route) {
      case "academic":
        agentResult = await academicNode({
          ...state,
          question,
          route,
        });
        break;

      case "campus":
        agentResult = await campusNode({
          ...state,
          question,
          route,
        });
        break;

      case "general":
        agentResult = await generalNode({
          ...state,
          question,
          route,
        });
        break;
    }

    results.push({
      question,
      route,
      response:
        typeof agentResult.response === "string"
          ? agentResult.response
          : JSON.stringify(
              agentResult.response
            ),
      sources: agentResult.sources ?? [],
    });
  }

  return {
    questionResults: results,
  };
}