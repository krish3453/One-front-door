import type {
  AgentStateType,
} from "../state.js";

import {
  classifyNode,
} from "./classify.node.js";

import {
  academicNode,
} from "../../academic/academic.node.js";

import {
  campusNode,
} from "../../campus/campus.node.js";

import {
  generalNode,
} from "../../general/general.node.js";

export async function executeQuestionsNode(
  state: AgentStateType
) {

  /*
   * If analyzer produced multiple questions,
   * process each one.
   *
   * Otherwise process the original question.
   */
  const questions =
    state.questions?.length
      ? state.questions
      : [state.question];

  const results = await Promise.all(
    questions.map(async (question) => {
      console.log(`\n[Orchestrator] Processing: ${question}`);

      /*
       * Intercept Action Tools (Petitions, etc.)
       */
      const { tryExecuteActionTool } = await import("../../tools/action-dispatcher.js");
      const actionResult = await tryExecuteActionTool(question);

      if (actionResult.actionExecuted && actionResult.formattedOutput) {
        console.log(`[Orchestrator] Action tool executed: ${actionResult.toolName}`);

        const isCampus = actionResult.toolName === "campus_petition_generator";
        const route = isCampus ? "campus" : "academic";

        return {
          question,
          route,
          response: actionResult.formattedOutput,
          sources: [
            {
              source: isCampus ? "Hostel Rules & Code of Conduct.pdf" : "Student Attendance & Examination Regulations 2024-25.pdf",
              page: 1,
              documentType: "regulation",
            },
          ],
        };
      }

      /*
       * Classify the question.
       */
      const classification = await classifyNode({
        ...state,
        question,
      });

      const route = classification.route;

      if (!route) {
        throw new Error(`Could not determine route for question: ${question}`);
      }

      console.log(`[Orchestrator] Route: ${route}`);

      let agentResult;

      /*
       * Execute the appropriate specialized agent.
       */
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

      return {
        question,
        route,
        response:
          typeof agentResult.response === "string"
            ? agentResult.response
            : JSON.stringify(agentResult.response),
        sources: agentResult.sources ?? [],
      };
    })
  );

  return {
    questionResults:
      results,
    route:
      results.length === 1
        ? results[0].route
        : undefined,
  };
}