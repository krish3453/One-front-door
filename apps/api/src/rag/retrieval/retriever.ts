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
}

const vectorStorePromise =
  createQdrantStore();

export async function retrieveDocuments(
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievedChunk[]> {
  const {
    k = 5,
    documentType,
  } = options;

  const vectorStore =
    await vectorStorePromise;

  /*
   * Retrieve more than we finally need.
   * This gives us room to remove duplicates.
   */
  const searchLimit =
    Math.max(k * 3, 10);

  const documents =
    await vectorStore.similaritySearch(
      query,
      searchLimit
    );

  /*
   * Optional document-type filtering.
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
   * Remove duplicate chunks.
   *
   * A chunk is considered the same if
   * source + page + content are identical.
   */
  const seen = new Set<string>();

  const uniqueDocuments =
    filteredDocuments.filter(
      (document) => {
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
      }
    );

  /*
   * Return only the requested number
   * of results.
   */
  return uniqueDocuments
    .slice(0, k)
    .map(
      (document) => ({
        content:
          document.pageContent,

        source:
          typeof document.metadata.source ===
          "string"
            ? document.metadata.source
            : "unknown",

        page:
          typeof document.metadata.page ===
          "number"
            ? document.metadata.page
            : undefined,

        documentType:
          typeof document.metadata.documentType ===
          "string"
            ? document.metadata.documentType
            : "unknown",

        extractionMethod:
          typeof document.metadata.extractionMethod ===
          "string"
            ? document.metadata.extractionMethod
            : "unknown",
      })
    );
}