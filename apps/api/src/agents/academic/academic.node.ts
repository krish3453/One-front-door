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
    "curriculum",
    "all courses",
    "all the courses",
    "list of courses",
    "list courses",
    "courses of",
    "courses in",
    "what are the courses",
    "tell courses",
    "course list",
    "program structure",
    "subjects in",
    "subjects of",
    "semester courses",
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
   * 0. CHECK ACTION TOOLS (ATTENDANCE BUNK PLANNER & FORMAL ACADEMIC PETITION DRAFTER)
   */
  const { tryExecuteActionTool } = await import("../tools/action-dispatcher.js");
  const actionResult = tryExecuteActionTool(state.question);
  if (actionResult.actionExecuted && actionResult.formattedOutput) {
    console.log(`[Academic Agent] Action tool executed: ${actionResult.toolName}`);
    return {
      response: actionResult.formattedOutput,
      sources: [
        {
          source: "Student Attendance & Examination Regulations 2024-25.pdf",
          page: 1,
          documentType: "attendance_notification",
        },
      ],
    };
  }

  /*
   * Syllabus and Curriculum questions require substantially
   * more context than normal questions.
   */
  const syllabusQuery =
    isSyllabusQuery(
      state.question
    );

  const retrievalK =
    syllabusQuery
      ? 35
      : 5;

  console.log(
    `[Academic Agent] Query type: ${
      syllabusQuery
        ? "SYLLABUS / CURRICULUM"
        : "NORMAL"
    }`
  );

  console.log(
    `[Academic Agent] Retrieval k: ${retrievalK}`
  );

  /*
   * 1. CHECK STRUCTURED CURRICULUM CATALOG
   * For broad catalog, degree curriculum, and course listing questions,
   * structured catalog provides 100% complete and authoritative course lists.
   */
  const { queryStructuredCurriculum } = await import("../../rag/catalog/curriculum.service.js");
  const structuredCatalog = await queryStructuredCurriculum(state.question);


  if (structuredCatalog && structuredCatalog.matched) {
    console.log(`[Academic Agent] Matched structured curriculum catalog: ${structuredCatalog.program} (${structuredCatalog.courses.length} courses)`);
  }

  /*
   * Retrieve documents from vector store / local chunks.
   */
  const documents =
    await retrieveDocuments(
      state.question,
      {
        k: retrievalK,
      }
    );

  if (
    documents.length === 0 && !structuredCatalog
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

  const vectorContext =
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

  const context = structuredCatalog
    ? `=== AUTHORITATIVE STRUCTURED CURRICULUM CATALOG ===\n${structuredCatalog.summaryText}\n\n=== SUPPLEMENTAL DOCUMENT CHUNKS ===\n${vectorContext}`
    : vectorContext;

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

14. When asked to list courses or curriculum for a program (such as B.Tech CSE or BBA LLB), list ALL courses present in the context grouped by Semester (Semester I through VIII, Specialization Electives) with their Course Code, Course Name, and Credits in a clean, structured table or bulleted list.

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
   * SOURCES FILTERING & DEDUPLICATION
   * ------------------------------------------------
   */

  let sources: Array<{ source: string; page?: number; documentType: string }> = [];

  if (structuredCatalog && structuredCatalog.matched) {
    const targetDoc = structuredCatalog.degree?.includes("LL.B")
      ? "BBA-LLB-Syllabus-2023-28.pdf"
      : "BTech-CSE-Syllabus-2025-29.pdf";

    // Keep only chunks matching the target program syllabus document
    const matchingChunks = orderedDocuments.filter(d => d.source === targetDoc);
    
    if (matchingChunks.length > 0) {
      const seenPages = new Set<string>();
      for (const d of matchingChunks) {
        const key = `${d.source}|${d.page ?? 1}`;
        if (!seenPages.has(key)) {
          seenPages.add(key);
          sources.push({
            source: d.source,
            page: d.page,
            documentType: "syllabus",
          });
        }
        if (sources.length >= 3) break;
      }
    } else {
      sources.push({
        source: targetDoc,
        page: 6,
        documentType: "syllabus",
      });
    }
  } else {
    // Normal query: deduplicate sources and cap at top 4
    const seenSources = new Set<string>();
    for (const d of orderedDocuments) {
      const key = `${d.source}|${d.page ?? ""}`;
      if (!seenSources.has(key)) {
        seenSources.add(key);
        sources.push({
          source: d.source,
          page: d.page,
          documentType: d.documentType,
        });
      }
      if (sources.length >= 4) break;
    }
  }

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