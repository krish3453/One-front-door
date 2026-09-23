import type { AgentStateType } from "../orchestrator/state.js";

import {
  retrieveDocuments,
} from "../../rag/retrieval/retriever.js";

import { createLLM } from "../../llm/factory.js";

const llm = createLLM();

export async function academicNode(
  state: AgentStateType
) {
  console.log(
    "\nAcademic Agent:"
  );

  console.log(
    "Retrieving relevant academic information..."
  );

  const documents =
    await retrieveDocuments(
      state.question,
      {
        k:5
      }
    );

  if (documents.length === 0) {
    return {
      response:
        "I could not find relevant information in the university documents.",

      sources: [],
    };
  }

  const context =
    documents
      .map(
        (document, index) =>
          `
SOURCE ${index + 1}
Source: ${document.source}
Page: ${document.page ?? "N/A"}
Document Type: ${document.documentType}

Content:
${document.content}
`
      )
      .join("\n--------------------\n");

  const response =
    await llm.invoke([
      {
        role: "system",

        content: `
You are the Academic Agent for One Front Door.

You answer questions using the university
documents provided in the context.

Rules:

1. Use the provided context as the primary
   source of truth.

2. Do not invent university-specific
   information.

3. If the context does not contain enough
   information to answer the question,
   clearly say that the available documents
   do not provide enough information.

4. Give a concise and direct answer.

5. Do not mention internal retrieval,
   embeddings, Qdrant, agents, or system
   architecture.

6. Do not create fake citations.

University document context:

${context}
`,
      },

      {
        role: "user",

        content:
          state.question,
      },
    ]);

  const sources =
    documents.map(
      (document) => ({
        source:
          document.source,

        page:
          document.page,

        documentType:
          document.documentType,
      })
    );

  return {
    response:
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(
            response.content
          ),

    sources,
  };
}