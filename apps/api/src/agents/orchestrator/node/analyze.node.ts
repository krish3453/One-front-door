import { createLLM } from "../../../llm/factory.js";

import type { AgentStateType } from "../state.js";

const llm = createLLM();

export interface AnalyzedQuestion {
  isMultiTopic: boolean;
  questions: string[];
}

export async function analyzeNode(
  state: AgentStateType
) {
  console.log("\nQuestion Analyzer:");
  console.log("Analyzing user query...");

  const response = await llm.invoke([
    {
      role: "system",
      content: `
You are a question analyzer for a university AI assistant.

Your job is to determine whether the user's query contains
one information need or multiple independent information needs.

Rules:

1. If the query contains only one information need,
   return one question.

2. If the query contains multiple independent information
   needs, split it into separate questions.

3. Preserve the original meaning.

4. Do not answer the questions.

5. Return ONLY valid JSON.

Required format:

{
  "isMultiTopic": true,
  "questions": [
    "question 1",
    "question 2"
  ]
}

For a single-topic query:

{
  "isMultiTopic": false,
  "questions": [
    "original question"
  ]
}
`,
    },
    {
      role: "user",
      content: state.question,
    },
  ]);

  const content =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  try {
    const parsed = JSON.parse(content) as AnalyzedQuestion;

    console.log("Analysis:", parsed);

    return {
      questions: parsed.questions,
      isMultiTopic: parsed.isMultiTopic,
    };
  } catch (error) {
    console.error(
      "Failed to parse question analysis:",
      error
    );

    return {
      questions: [state.question],
      isMultiTopic: false,
    };
  }
}