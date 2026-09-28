import type { AgentStateType } from "../orchestrator/state.js";

import {
  retrieveDocuments,
} from "../../rag/retrieval/retriever.js";

import {
  createLLM,
} from "../../llm/factory.js";

const llm =
  createLLM("academic");

/*
 * --------------------------------------------------
 * DETECT SYLLABUS / COURSE OVERVIEW QUESTIONS
 * --------------------------------------------------
 */

function isSyllabusQuery(
  query: string
): boolean {

  const normalized =
    query.toLowerCase();

  const syllabusKeywords = [
    "syllabus",
    "syllabi",
    "modules",
    "module",
    "course content",
    "course contents",
    "course outline",
    "course structure",
    "topics",
    "what does the course cover",
    "what is covered",
    "course curriculum",
  ];

  return syllabusKeywords.some(
    (keyword) =>
      normalized.includes(keyword)
  );
}

/*
 * --------------------------------------------------
 * ACADEMIC NODE
 * --------------------------------------------------
 */

export async function academicNode(
  state: AgentStateType
) {

  console.log(
    "\n[Academic Agent]"
  );

  console.log(
    `Retrieving information for: ${state.question}`
  );

  /*
   * Syllabus questions require substantially
   * more context than normal questions.
   */
  const syllabusQuery =
    isSyllabusQuery(
      state.question
    );

  const retrievalK =
    syllabusQuery
      ? 25
      : 5;

  console.log(
    `[Academic Agent] Query type: ${
      syllabusQuery
        ? "SYLLABUS"
        : "NORMAL"
    }`
  );

  console.log(
    `[Academic Agent] Retrieval k: ${retrievalK}`
  );

  /*
   * Retrieve documents.
   */
  const documents =
    await retrieveDocuments(
      state.question,
      {
        k: retrievalK,
      }
    );

  if (
    documents.length === 0
  ) {

    return {
      response:
        "I could not find relevant information in the university documents.",

      sources: [],
    };
  }

  /*
   * ------------------------------------------------
   * REMOVE DUPLICATE DOCUMENTS
   * ------------------------------------------------
   */

  const seen =
    new Set<string>();

  const uniqueDocuments =
    documents.filter(
      (document) => {

        const key =
          [
            document.source,
            document.page,
            document.content,
          ].join("|");

        if (
          seen.has(key)
        ) {
          return false;
        }

        seen.add(key);

        return true;
      }
    );

  console.log(
    `[Academic Agent] Retrieved ${uniqueDocuments.length} unique chunks`
  );

  /*
   * ------------------------------------------------
   * SORT BY PAGE FOR SYLLABUS QUESTIONS
   * ------------------------------------------------
   *
   * Similarity search can return pages in an
   * arbitrary relevance order.
   *
   * For syllabus questions, page order is much
   * more useful because it allows the LLM to see:
   *
   * Module 1
   * Module 2
   * Module 3
   * Module 4
   */

  const orderedDocuments =
    syllabusQuery
      ? [...uniqueDocuments].sort(
          (a, b) => {

            const pageA =
              a.page ??
              Number.MAX_SAFE_INTEGER;

            const pageB =
              b.page ??
              Number.MAX_SAFE_INTEGER;

            return pageA - pageB;
          }
        )
      : uniqueDocuments;

  /*
   * ------------------------------------------------
   * BUILD CONTEXT
   * ------------------------------------------------
   */

  const context =
    orderedDocuments
      .map(
        (
          document,
          index
        ) => `
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

  /*
   * ------------------------------------------------
   * LLM PROMPT
   * ------------------------------------------------
   */

  const response =
    await llm.invoke([
      {
        role: "system",

        content: `
You are the Academic Agent for One Front Door.

You answer university-related questions using
the university documents provided in the context.

IMPORTANT RULES:

1. Answer the user's question directly.

2. Use the provided university documents
   as the primary source of truth.

3. Do not invent university-specific
   information.

4. If the documents do not contain enough
   information, clearly say so.

5. For syllabus or course-content questions,
   provide ALL relevant modules/topics that
   are present in the provided context.

6. Do NOT stop after the first module if
   later modules are present in the context.

7. For syllabus questions, organize the answer
   in the same module structure as the source:

   Module 1
   Module 2
   Module 3
   Module 4

   Include contact hours when available.

8. Do not combine or invent module numbers.

9. If only some modules are present in the
   retrieved university documents, clearly state
   which modules are available rather than
   inventing the missing modules.

10. Keep the answer useful and reasonably concise.

11. Do not mention:
   - retrieval
   - embeddings
   - Qdrant
   - agents
   - internal architecture
   - vector databases

12. Do not create fake citations.

13. Only use information actually present
    in the university document context.

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

  /*
   * ------------------------------------------------
   * SOURCES
   * ------------------------------------------------
   */

  const sources =
    orderedDocuments.map(
      (document) => ({
        source:
          document.source,

        page:
          document.page,

        documentType:
          document.documentType,
      })
    );

  /*
   * ------------------------------------------------
   * RESPONSE
   * ------------------------------------------------
   */

  return {
    response:
      typeof response.content ===
      "string"
        ? response.content
        : JSON.stringify(
            response.content
          ),

    sources,
  };
}