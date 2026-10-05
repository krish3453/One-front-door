import {
  createQdrantStore,
} from "../vectorstore/qdrant.js";
import { loadRAGChunks } from "../ingestion/build-documents.js";
import type { Document } from "@langchain/core/documents";

export interface RetrievedChunk {
  content: string;
  source: string;
  page?: number;
  documentType: string;
  extractionMethod: string;
}

export interface RetrievalOptions {
  k?: number;
  documentType?: string;
  courseCode?: string;
  syllabus?: boolean;
}

const vectorStorePromise =
  createQdrantStore();

/*
 * --------------------------------------------------
 * COURSE CODE DETECTION
 * --------------------------------------------------
 *
 * Supports:
 *
 * CSET101
 * CSET 101
 * cset101
 * cset 101
 */

function detectCourseCode(
  query: string
): string | undefined {

  const match =
    query.match(
      /\b(CSET|LAWS|BLAW|MGMT|MATH|PHY|ECE|MECH|BIO|CHEM|ENG|ECON|SOC|PSY|LLLB)\s*(\d{3,4}[A-Z]?)\b/i
    );

  if (!match) {
    return undefined;
  }

  const prefix = match[1].toUpperCase();
  const code = match[2].toUpperCase();
  return `${prefix}${code}`;
}

/*
 * --------------------------------------------------
 * SYLLABUS QUERY DETECTION
 * --------------------------------------------------
 */

function detectSyllabusQuery(
  query: string
): boolean {

  const normalized =
    query.toLowerCase();

  const keywords = [
    "syllabus",
    "syllabi",
    "modules",
    "module",
    "course content",
    "course contents",
    "course outline",
    "course structure",
    "curriculum",
    "topics",
    "what does the course cover",
    "what is covered",
  ];

  return keywords.some(
    (keyword) =>
      normalized.includes(keyword)
  );
}

interface QueryContext {
  isSyllabus: boolean;
  isCurriculum: boolean;
  targetSource?: string;
  targetDocType?: string;
  expandedTerms: string[];
}

function analyzeQueryContext(query: string): QueryContext {
  const isSyllabus = /\b(syllabus|syllabi|modules?|topics?|course content|curriculum|subjects?|courses?|program structure|what is taught|credits?|semester|sem\s*\d)\b/i.test(query);
  const isCurriculum = /\b(all courses|all the courses|list of courses|course list|curriculum|subjects?|courses? of|courses? in|semesters?|semester courses|sem\s*\d)\b/i.test(query);

  let targetSource: string | undefined;
  let targetDocType: string | undefined;
  const expandedTerms: string[] = [];

  // 1. Law / BBA LLB / BA LLB
  if (/\b(bba\s*llb|ballb|bballb|ba\s*llb|llb|law|school of law|legal|jurisprudence|torts|constitutional law|contract law|crpc|ipc)\b/i.test(query)) {
    targetSource = "BBA-LLB-Syllabus-2023-28.pdf";
    targetDocType = "syllabus";
    expandedTerms.push("bba", "llb", "law", "b.b.a.", "ll.b.", "semester", "school of law");
  }
  // 2. B.Tech / CSE
  else if (/\b(btech|b\s*tech|cse|computer science|cset|programming|software engineering|algorithms|data structures|web dev|ai|machine learning)\b/i.test(query) && isSyllabus) {
    targetSource = "BTech-CSE-Syllabus-2025-29.pdf";
    targetDocType = "syllabus";
    expandedTerms.push("btech", "cse", "computer science", "semester", "cset", "credit");
  }
  // 2b. Generic Syllabus / Curriculum question (e.g. "tell sem 1 syllabus")
  else if (isSyllabus || isCurriculum) {
    targetDocType = "syllabus";
    targetSource = "BTech-CSE-Syllabus-2025-29.pdf";
    expandedTerms.push("semester", "course", "credit", "module");
  }
  // 3. Attendance / Debarred
  else if (/\b(attendance|short attendance|75%|debarred|detained|medical leave|condonation|leaves?)\b/i.test(query)) {
    targetSource = "Notification-for-Minimum-Attendance-for-Students.pdf";
    targetDocType = "attendance_notification";
    expandedTerms.push("attendance", "minimum", "75%", "notification");
  }
  // 4. Examination / Manual / Grading / Backlog
  else if (/\b(exams?|examinations?|grading|mid term|end term|sgpa|cgpa|gpa|marks|pass marks|backlog|reappear|supplementary|moderation|re\s*evaluation|unfair means|u fm)\b/i.test(query)) {
    targetSource = "Examination-Manual-2024-25-.pdf";
    targetDocType = "examination_manual";
    expandedTerms.push("examination", "grade", "marks", "evaluation");
  }
  // 5. Discipline / Conduct / Ragging / Hostels
  else if (/\b(discipline|conduct|ragging|anti ragging|alcohol|smoking|drugs|substance|fight|misconduct|curfew|hostel rules?|fine|penalty|suspension|expulsion)\b/i.test(query)) {
    targetSource = "STUDENTS-DISCIPLINE-AND-CONDUCT-RULES.pdf";
    targetDocType = "discipline_rules";
    expandedTerms.push("discipline", "conduct", "rules", "student");
  }
  // 6. Campus Brochure / General Facilities
  else if (/\b(brochure|campus life|swimming pool|sports|gym|placement stats|highest package|average package|recruiters)\b/i.test(query)) {
    targetSource = "Bennett-Brochure.pdf";
    targetDocType = "brochure";
  }

  return { isSyllabus, isCurriculum, targetSource, targetDocType, expandedTerms };
}

/*
 * --------------------------------------------------
 * RETRIEVE DOCUMENTS
 * --------------------------------------------------
 */

export async function retrieveDocuments(
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievedChunk[]> {

  const {
    k = 5,
    documentType,
    courseCode,
    syllabus,
  } = options;

  const vectorStore =
    await vectorStorePromise;

  /*
   * ------------------------------------------------
   * DETECT COURSE & PROGRAM CONTEXT
   * ------------------------------------------------
   */

  const detectedCourseCode =
    courseCode ??
    detectCourseCode(query);

  const contextInfo = analyzeQueryContext(query);

  const isSyllabus =
    syllabus ??
    (contextInfo.isSyllabus || contextInfo.isCurriculum);

  console.log(
    `[Retriever] Course code: ${
      detectedCourseCode ??
      "none"
    }`
  );

  console.log(
    `[Retriever] Target Source: ${
      contextInfo.targetSource ?? "any"
    } | Syllabus/Curriculum: ${isSyllabus}`
  );

  /*
   * ------------------------------------------------
   * SEARCH LIMIT
   * ------------------------------------------------
   *
   * Normal question:
   *
   * k = 5
   * searchLimit = 15
   *
   * Syllabus question:
   *
   * k = 25
   * searchLimit = 75
   *
   * This gives Qdrant enough candidates to find
   * Module 1, 2, 3 and 4.
   */

  const searchLimit =
    isSyllabus
      ? Math.max(
          k * 3,
          50
        )
      : Math.max(
          k * 3,
          10
        );

  console.log(
    `[Retriever] Search limit: ${searchLimit}`
  );

  /*
   * ------------------------------------------------
   * QDRANT FILTER
   * ------------------------------------------------
   */

  let filter:
    | {
        must: Array<{
          key: string;
          match: {
            value: string;
          };
        }>;
      }
    | undefined;

  if (
    detectedCourseCode
  ) {

    filter = {
      must: [
        {
          key:
            "metadata.courseCode",

          match: {
            value:
              detectedCourseCode,
          },
        },
      ],
    };

    console.log(
      `[Retriever] Applying course filter: ${detectedCourseCode}`
    );
  }

  /*
   * ------------------------------------------------
   * SEARCH QUERY
   * ------------------------------------------------
   *
   * For syllabus questions, enrich the semantic
   * query so chunks containing module information
   * rank better.
   */

  const searchQuery =
    isSyllabus &&
    detectedCourseCode
      ? `${detectedCourseCode} complete syllabus modules course content topics`
      : query;

  console.log(
    `[Retriever] Search query: ${searchQuery}`
  );

  /*
   * ------------------------------------------------
   * QDRANT SEARCH
   * ------------------------------------------------
   */

  let documents: Document[] = [];

  try {
    documents = await vectorStore.similaritySearch(
      searchQuery,
      searchLimit,
      filter
    );
  } catch (err: any) {
    console.warn(`[Retriever] Qdrant vector search failed: ${err.message}`);
  }

  console.log(
    `[Retriever] Raw results: ${documents.length}`
  );

  /*
   * ------------------------------------------------
   * FALLBACK: RETRY WITHOUT COURSE FILTER
   * ------------------------------------------------
   */
  if (documents.length === 0 && detectedCourseCode) {
    try {
      documents = await vectorStore.similaritySearch(
        searchQuery,
        searchLimit
      );
    } catch {
      // Ignored - will use local chunks fallback
    }
  }

  /*
   * ------------------------------------------------
   * SMART COURSE CODE & LOCAL CHUNK ENRICHMENT
   * Ensure specific course module chunks (Module 1, 2, 3, 4)
   * are ALWAYS retrieved when a course code is queried.
   * ------------------------------------------------
   */
  try {
    const allChunks = await loadRAGChunks();
    const lowerQuery = query.toLowerCase();
    const searchTerms = lowerQuery
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !["what", "which", "when", "where", "how", "the", "for", "and", "syllabus"].includes(t));

    // If a course code is detected, find all chunks tagged or mentioning this course
    if (detectedCourseCode) {
      const courseChunks = allChunks.filter((doc) => {
        const metaCode = String(doc.metadata.courseCode || "").toUpperCase();
        const content = doc.pageContent;
        return metaCode === detectedCourseCode.toUpperCase() ||
          new RegExp(`\\b${detectedCourseCode}\\b`, "i").test(content);
      });

      if (courseChunks.length > 0) {
        console.log(`[Retriever] Found ${courseChunks.length} exact course module chunks for ${detectedCourseCode}`);
        // Prepend course chunks so they take priority over broad overview pages
        documents = [...courseChunks, ...documents];
      }
    }

    // If still empty or low results, run scored fallback across all chunks
    if (documents.length === 0) {
      const scored = allChunks.map((doc) => {
        let score = 0;
        const metaCode = String(doc.metadata.courseCode || "").toUpperCase();
        const content = doc.pageContent.toLowerCase();
        const docSource = String(doc.metadata.source || "");
        const docType = String(doc.metadata.documentType || "");

        if (contextInfo.targetSource && docSource === contextInfo.targetSource) {
          score += 40;
          if (content.includes("detailed syllabus") || content.includes("list of courses") || content.includes("program structure")) {
            score += 150;
          }
          if (content.includes("semester") || content.includes("module")) {
            score += 80;
          }
        }

        if (contextInfo.targetDocType && docType === contextInfo.targetDocType) {
          score += 25;
        }

        if (detectedCourseCode && (metaCode === detectedCourseCode.toUpperCase() || content.includes(detectedCourseCode.toLowerCase()))) {
          score += 200;
        }

        const allTerms = [...searchTerms, ...contextInfo.expandedTerms];
        for (const term of allTerms) {
          if (content.includes(term)) {
            score += 8;
          }
        }

        return { doc, score };
      });

      const matched = scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, searchLimit)
        .map((s) => s.doc);

      if (matched.length > 0) {
        console.log(`[Retriever] Local chunk fallback matched ${matched.length} chunks.`);
        documents = matched;
      }
    }
  } catch (err: any) {
    console.warn(`[Retriever] Local chunk lookup error: ${err.message}`);
  }

  /*
   * ------------------------------------------------
   * DOCUMENT TYPE & TARGET SOURCE FILTER
   * ------------------------------------------------
   */

  const effectiveDocType = documentType || contextInfo.targetDocType;

  let filteredDocuments = documents;

  if (effectiveDocType) {
    const matchedType = documents.filter(
      (document) =>
        document.metadata.documentType === effectiveDocType
    );
    if (matchedType.length > 0) {
      filteredDocuments = matchedType;
    }
  }

  if (contextInfo.targetSource) {
    const matchedSource = filteredDocuments.filter(
      (document) =>
        document.metadata.source === contextInfo.targetSource
    );
    if (matchedSource.length > 0) {
      filteredDocuments = matchedSource;
    }
  }

  /*
   * ------------------------------------------------
   * REMOVE DUPLICATES
   * ------------------------------------------------
   */

  const seen =
    new Set<string>();

  const uniqueDocuments =
    filteredDocuments.filter(
      (document) => {

        const key =
          [
            document.metadata
              .source,

            document.metadata
              .page,

            document.pageContent,
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
    `[Retriever] Unique results: ${uniqueDocuments.length}`
  );

  /*
   * ------------------------------------------------
   * SORT SYLLABUS RESULTS BY PAGE
   * ------------------------------------------------
   */

  const orderedDocuments =
    isSyllabus
      ? [...uniqueDocuments].sort(
          (a, b) => {

            const pageA =
              typeof a.metadata.page ===
              "number"
                ? a.metadata.page
                : Number.MAX_SAFE_INTEGER;

            const pageB =
              typeof b.metadata.page ===
              "number"
                ? b.metadata.page
                : Number.MAX_SAFE_INTEGER;

            return pageA - pageB;
          }
        )
      : uniqueDocuments;

  /*
   * ------------------------------------------------
   * RETURN
   * ------------------------------------------------
   */

  return orderedDocuments
    .slice(0, k)
    .map(
      (document) => ({

        content:
          document.pageContent,

        source:
          typeof document.metadata
            .source === "string"
            ? document.metadata.source
            : "unknown",

        page:
          typeof document.metadata.page ===
          "number"
            ? document.metadata.page
            : undefined,

        documentType:
          typeof document.metadata
            .documentType ===
          "string"
            ? document.metadata
                .documentType
            : "unknown",

        extractionMethod:
          typeof document.metadata
            .extractionMethod ===
          "string"
            ? document.metadata
                .extractionMethod
            : "unknown",
      })
    );
}