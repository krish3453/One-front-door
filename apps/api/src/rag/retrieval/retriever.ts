import { createQdrantStore } from "../vectorstore/qdrant.js";

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
}

const vectorStorePromise = createQdrantStore();

function detectCourseCode(query: string): string | undefined {
  const match = query.match(/\bCSET\d{3}\b/i);

  return match ? match[0].toUpperCase() : undefined;
}

export async function retrieveDocuments(
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievedChunk[]> {
  const {
    k = 5,
    documentType,
    courseCode,
  } = options;

  const vectorStore = await vectorStorePromise;

  /*
   * Detect course code from the user's query.
   *
   * Example:
   * "What are the modules in CSET101?"
   *
   * becomes:
   * detectedCourseCode = "CSET101"
   */
  const detectedCourseCode =
    courseCode ?? detectCourseCode(query);

  /*
   * Retrieve more than we finally need.
   */
  const searchLimit = Math.max(k * 3, 10);

  /*
   * Build a Qdrant metadata filter.
   *
   * Qdrant will apply this filter BEFORE
   * returning similarity-search results.
   */
  const filter = detectedCourseCode
    ? {
        must: [
          {
            key: "metadata.courseCode",
            match: {
              value: detectedCourseCode,
            },
          },
        ],
      }
    : undefined;

  const documents = await vectorStore.similaritySearch(
    query,
    searchLimit,
    filter
  );

  /*
   * Optional document-type filtering.
   */
  const filteredDocuments = documentType
    ? documents.filter(
        (document) =>
          document.metadata.documentType ===
          documentType
      )
    : documents;

  /*
   * Remove duplicate chunks.
   *
   * A chunk is considered identical when:
   * source + page + content are the same.
   */
  const seen = new Set<string>();

  const uniqueDocuments =
    filteredDocuments.filter((document) => {
      const key = [
        document.metadata.source,
        document.metadata.page,
        document.pageContent,
      ].join("|");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    });

  /*
   * Return only the requested number of results.
   */
  return uniqueDocuments
    .slice(0, k)
    .map((document) => ({
      content: document.pageContent,

      source:
        typeof document.metadata.source === "string"
          ? document.metadata.source
          : "unknown",

      page:
        typeof document.metadata.page === "number"
          ? document.metadata.page
          : undefined,

      documentType:
        typeof document.metadata.documentType === "string"
          ? document.metadata.documentType
          : "unknown",

      extractionMethod:
        typeof document.metadata.extractionMethod === "string"
          ? document.metadata.extractionMethod
          : "unknown",
    }));
}