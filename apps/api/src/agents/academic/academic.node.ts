import type { AgentStateType } from "../orchestrator/state.js";

import { retrieveDocuments } from "../../rag/retrieval/retriever.js";
import { createLLM } from "../../llm/factory.js";

const llm = createLLM();

export async function academicNode(
  state: AgentStateType
) {
  console.log("\n[Academic Agent]");
  console.log(
    `Retrieving information for: ${state.question}`
  );

  const documents = await retrieveDocuments(
    state.question,
    {
      k: 5,
    }
  );

  if (documents.length === 0) {
    return {
      response:
        "I could not find relevant information in the university documents.",
      sources: [],
    };
  }

  const seen = new Set<string>();

  const uniqueDocuments =
    documents.filter((document) => {
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
    });

  console.log(
    `[Academic Agent] Retrieved ${uniqueDocuments.length} unique chunks`
  );

  const context = uniqueDocuments
    .map(
      (document, index) => `
SOURCE ${index + 1}

Source:
${document.source}

Page:
${document.page ?? "N/A"}

Document Type:
${document.documentType}

Content:
${document.content}
`
    )
    .join(
      "\n--------------------\n"
    );

  const response = await llm.invoke([
    {
      role: "system",
      content: `
You are the Academic Agent for One Front Door.

You answer university-related questions using
the university documents provided in the context.

Rules:

1. Answer the user's question directly.

2. Use the provided university documents
   as the primary source of truth.

3. Do not invent university-specific
   information.

4. If the documents do not contain enough
   information, clearly say so.

5. Keep the answer concise and useful.

6. Do not mention:
   - retrieval
   - embeddings
   - Qdrant
   - agents
   - internal architecture

7. Do not create fake citations.

University document context:

${context}
`,
    },
    {
      role: "user",
      content: state.question,
    },
  ]);

  const sources = uniqueDocuments.map(
    (document) => ({
      source: document.source,
      page: document.page,
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