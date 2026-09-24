import type { AgentStateType } from "../orchestrator/state.js";

import { createLLM } from "../../llm/factory.js";

const llm = createLLM();

export async function generalNode(
  state: AgentStateType
) {
  console.log("\n[General Agent]");
  console.log(
    `Processing: ${state.question}`
  );

  const response = await llm.invoke([
    {
      role: "system",
      content: `
You are the General Agent for One Front Door,
a university AI assistant.

Answer general questions clearly,
accurately, and concisely.

Rules:

1. Answer the user's question directly.

2. Do not invent university-specific
   information.

3. If the question requires university-specific
   information that you do not have, say that
   the relevant university information is not
   available to you.

4. Do not mention internal agents,
   routing, orchestration, or system architecture.
`,
    },
    {
      role: "user",
      content: state.question,
    },
  ]);

  return {
    response:
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(
            response.content
          ),

    sources: [],
  };
}