import "dotenv/config";

import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";

import { createEmbeddings } from "../embeddings/embedding-model.js";

const COLLECTION_NAME =
  process.env.QDRANT_COLLECTION ||
  "one_front_door_documents";

const QDRANT_URL =
  process.env.QDRANT_URL ||
  "http://localhost:6333";

const embeddings = createEmbeddings();

const testDocument = new Document({
  pageContent:
    "Bennett University requires students to maintain the minimum attendance required for examination eligibility.",
  metadata: {
    source: "test-document.pdf",
    page: 1,
    documentType: "attendance_notification",
    extractionMethod: "test",
  },
});

console.log("Creating Qdrant collection...");

const vectorStore =
  await QdrantVectorStore.fromDocuments(
    [testDocument],
    embeddings,
    {
      url: QDRANT_URL,
      collectionName: COLLECTION_NAME,
    }
  );

console.log(
  "Document successfully inserted into Qdrant."
);

console.log("\nTesting similarity search...");

const results =
  await vectorStore.similaritySearch(
    "What are the attendance requirements?",
    1
  );

console.log("\nSearch result:");

for (const result of results) {
  console.log("\nContent:");
  console.log(result.pageContent);

  console.log("\nMetadata:");
  console.log(result.metadata);
}