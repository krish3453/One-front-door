import {
  createLLM,
} from "../../../llm/factory.js";

import type {
  AgentStateType,
} from "../state.js";

const llm =
  createLLM("synthesizer");

export async function synthesizeNode(
  state: AgentStateType
) {

  /*
   * No agent results.
   */
  if (
    !state.questionResults?.length
  ) {
    return {
      response:
        state.response ??
        "I could not generate a response.",

      sources:
        state.sources ?? [],
    };
  }

  /*
   * Single question fast-path:
   * If there is only 1 question result, the specialized agent has already generated
   * a complete answer. Bypassing the synthesizer LLM call saves latency.
   */
  if (state.questionResults.length === 1) {
    console.log(
      "[Synthesizer] Fast-path: Single question result, bypassing synthesis LLM call"
    );

    return {
      response: state.questionResults[0].response,
      sources: state.questionResults[0].sources ?? [],
      route: state.questionResults[0].route,
    };
  }

  /*
   * Format specialized-agent
   * responses for the synthesizer.
   */
  const formattedResults =
    state.questionResults
      .map(
        (
          result,
          index
        ) =>
          `
Question ${index + 1}:
${result.question}

Answer:
${result.response}
`
      )
      .join(
        "\n--------------------\n"
      );

  console.log(
    "\n[Synthesizer] Generating final answer..."
  );

  const response =
    await llm.invoke([
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

        content:
          state.question,
      },
    ]);

  const finalResponse =
    typeof response.content ===
    "string"
      ? response.content
      : JSON.stringify(
          response.content
        );

  /*
   * Collect sources from all
   * specialized agents.
   */
  const allSources =
    state.questionResults.flatMap(
      (result) =>
        result.sources ?? []
    );

  /*
   * Remove duplicate sources.
   */
  const uniqueSources =
    Array.from(
      new Map(
        allSources.map(
          (source) => [
            `${source.source}|${
              source.page ?? ""
            }|${source.documentType}`,

            source,
          ]
        )
      ).values()
    );

  return {
    response:
      finalResponse,

    sources:
      uniqueSources,

    route:
      state.questionResults.length === 1
        ? state.questionResults[0].route
        : undefined,
  };
}