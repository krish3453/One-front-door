import {
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";

import { AgentState } from "./state.js";
import { classifyNode } from "./node/classify.node.js";
import { routeByAgent } from "./node/route.node.js";

import { academicNode } from "../academic/academic.node.js";
import { campusNode } from "../campus/campus.node.js";
import { generalNode } from "../general/general.node.js";

const workflow = new StateGraph(AgentState)
  .addNode("classify", classifyNode)
  .addNode("academic", academicNode)
  .addNode("campus", campusNode)
  .addNode("general", generalNode)

  .addEdge(START, "classify")

  .addConditionalEdges(
    "classify",
    routeByAgent,
    {
      academic: "academic",
      campus: "campus",
      general: "general",
    }
  )

  .addEdge("academic", END)
  .addEdge("campus", END)
  .addEdge("general", END);

export const graph = workflow.compile();