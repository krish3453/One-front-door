import type { AgentStateType } from "../state.js";
import { classifyNode } from "./classify.node.js";

import { academicNode } from "../../academic/academic.node.js";
import { campusNode } from "../../campus/campus.node.js";
import { generalNode } from "../../general/general.node.js";

export async function executeQuestionsNode(
    state: AgentStateType
) {
    const questions = state.questions ?? [state.question];

    const results = [];

    for (const question of questions) {
        // Classify this individual question
        const classification = await classifyNode({
            ...state,
            question,
        });

        const route = classification.route;

        if (!route) {
            throw new Error(
                `Could not determine route for question: ${question}`
            );
        }

        // Execute the appropriate agent
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
            response: agentResult.response,
        });
    }

    return {
        questionResults: results,
    };
}