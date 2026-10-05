import { retrieveDocuments } from "../../../rag/retrieval/retriever.js";

export async function searchCampusRules(query: string) {
  try {
    const docs = await retrieveDocuments(query, {
      k: 5,
    });

    return docs.map((doc) => ({
      content: doc.content,
      source: doc.source,
      page: doc.page,
      documentType: doc.documentType,
    }));
  } catch (error) {
    console.error("[CampusTools] Failed to retrieve campus rules:", error);
    return [];
  }
}
