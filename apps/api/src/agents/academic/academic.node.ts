import type { AgentStateType } from "../orchestrator/state.js";

import { retrieveDocuments } from "../../rag/retrieval/retriever.js";
import { createLLM } from "../../llm/factory.js";

const llm = createLLM();

export async function academicNode(
  state: AgentStateType
) {
  console.log("\nAcademic Agent:");

  const questions =
    state.questions?.length
      ? state.questions
      : [state.question];

  console.log(
    `Retrieving information for ${questions.length} question(s)...`
  );

  const allDocuments = [];

  for (const question of questions) {
    console.log(`\nRetrieving for: ${question}`);

    const documents = await retrieveDocuments(
      question,
      { k: 5 }
    );

    allDocuments.push(...documents);
  }

  if (allDocuments.length === 0) {
    return {
      response:
        "I could not find relevant information in the university documents.",
      sources: [],
    };
  }

  // Remove duplicate chunks retrieved by different questions.
  const seen = new Set<string>();

  const documents = allDocuments.filter(
    (document) => {
      const key = [
        document.source,
        document.page,
        document.content,
      ].join("|");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );

  console.log(
    `Retrieved ${documents.length} unique document chunks.`
  );

  const context = documents
    .map(
      (document, index) => `
SOURCE ${index + 1}
Source: ${document.source}
Page: ${document.page ?? "N/A"}
Document Type: ${document.documentType}

Content:
${document.content}
`
    )
    .join("\n--------------------\n");

  const response = await llm.invoke([
    {
      role: "system",
      content: `
You are the Academic Agent for One Front Door.

You answer university-related questions using
the university documents provided in the context.

Rules:

1. Answer all parts of the user's question.

2. Use the provided context as the primary
   source of truth.

3. Do not invent university-specific
   information.

4. If the context does not contain enough
   information for a particular part of the
   question, clearly say that the available
   documents do not provide enough information
   for that part.

5. Give a concise and direct answer.

6. When the user asks multiple questions,
   clearly separate the answers.

7. Do not mention internal retrieval,
   embeddings, Qdrant, agents, or system
   architecture.

8. Do not create fake citations.

University document context:

${context}
`,
    },
    {
      role: "user",
      content: state.question,
    },
  ]);

  const sources = documents.map((document) => ({
    source: document.source,
    page: document.page,
    documentType: document.documentType,
  }));

  return {
    response:
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content),

    sources,
  };
}