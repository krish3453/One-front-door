import { createLLM } from "../../../llm/factory.js";

import type { AgentStateType } from "../state.js";

const llm = createLLM();

export async function synthesizeNode(
  state: AgentStateType
) {
  if (!state.questionResults?.length) {
    return {
      response:
        state.response ??
        "I could not generate a response.",

      sources:
        state.sources ?? [],
    };
  }

  const formattedResults =
    state.questionResults
      .map(
        (result, index) =>
          `
Question ${index + 1}:
${result.question}

Answer:
${result.response}
`
      )
      .join("\n--------------------\n");

  console.log(
    "\n[Synthesizer] Generating final answer..."
  );

  const response = await llm.invoke([
    {
      role: "system",
      content: `
You are the final response synthesizer
for One Front Door, a university AI assistant.

Combine the answers provided by the
specialized agents into one clear,
natural response for the user.

Rules:

1. Answer every question.

2. Preserve the factual information
   provided by the agents.

3. Do not invent additional information.

4. Do not contradict the provided answers.

5. When there are multiple questions,
   clearly separate the answers.

6. Use natural and user-friendly language.

7. Do not mention:
   - agents
   - routing
   - orchestration
   - retrieval
   - Qdrant
   - embeddings
   - internal architecture

8. Do not create fake citations.

9. Keep the final answer concise.

Agent answers:

${formattedResults}
`,
    },
    {
      role: "user",
      content: state.question,
    },
  ]);

  const finalResponse =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(
          response.content
        );

  const allSources =
    state.questionResults.flatMap(
      (result) =>
        result.sources ?? []
    );

  const uniqueSources =
    Array.from(
      new Map(
        allSources.map((source) => [
          `${source.source}|${
            source.page ?? ""
          }|${source.documentType}`,
          source,
        ])
      ).values()
    );

  return {
    response: finalResponse,
    sources: uniqueSources,
  };
}