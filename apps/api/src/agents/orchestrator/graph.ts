import {
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";

import { AgentState } from "./state.js";

import { analyzeNode } from "./node/analyze.node.js";
import { executeQuestionsNode } from "./node/execute-questions.node.js";
import { synthesizeNode } from "./node/synthesize.node.js";

const workflow = new StateGraph(AgentState)

  .addNode("analyze", analyzeNode)
  .addNode("executeQuestions", executeQuestionsNode)
  .addNode("synthesize", synthesizeNode)

  .addEdge(START, "analyze")

  .addEdge("analyze", "executeQuestions")

  .addEdge("executeQuestions", "synthesize")

  .addEdge("synthesize", END);

export const graph = workflow.compile();