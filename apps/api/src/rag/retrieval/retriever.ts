import {
  createQdrantStore,
} from "../vectorstore/qdrant.js";

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
      /\bCSET\s*(\d{3})\b/i
    );

  if (!match) {
    return undefined;
  }

  return `CSET${match[1]}`;
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
   * DETECT COURSE
   * ------------------------------------------------
   */

  const detectedCourseCode =
    courseCode ??
    detectCourseCode(query);

  /*
   * ------------------------------------------------
   * DETECT SYLLABUS QUERY
   * ------------------------------------------------
   */

  const isSyllabus =
    syllabus ??
    detectSyllabusQuery(query);

  console.log(
    `[Retriever] Course code: ${
      detectedCourseCode ??
      "none"
    }`
  );

  console.log(
    `[Retriever] Syllabus query: ${
      isSyllabus
    }`
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

  let documents =
    await vectorStore.similaritySearch(
      searchQuery,
      searchLimit,
      filter
    );

  console.log(
    `[Retriever] Raw results: ${documents.length}`
  );

  /*
   * ------------------------------------------------
   * FALLBACK
   * ------------------------------------------------
   *
   * If course metadata was not correctly stored
   * during ingestion, the metadata filter can
   * return zero results.
   *
   * Instead of failing completely, retry without
   * the course filter.
   */

  if (
    documents.length === 0 &&
    detectedCourseCode
  ) {

    console.log(
      "[Retriever] Course-filter search returned 0 results."
    );

    console.log(
      "[Retriever] Retrying without course metadata filter."
    );

    documents =
      await vectorStore.similaritySearch(
        searchQuery,
        searchLimit
      );

    console.log(
      `[Retriever] Fallback results: ${documents.length}`
    );
  }

  /*
   * ------------------------------------------------
   * DOCUMENT TYPE FILTER
   * ------------------------------------------------
   */

  const filteredDocuments =
    documentType
      ? documents.filter(
          (document) =>
            document.metadata
              .documentType ===
            documentType
        )
      : documents;

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