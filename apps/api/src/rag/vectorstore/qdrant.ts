import "dotenv/config";

import { QdrantVectorStore } from "@langchain/qdrant";

import { createEmbeddings } from "../embeddings/embedding-model.js";

const embeddings = createEmbeddings();

export const qdrantConfig = {
  url:
    process.env.QDRANT_URL ||
    "http://localhost:6333",

  collectionName:
    process.env.QDRANT_COLLECTION ||
    "one_front_door_knowledge",
};

export async function createQdrantStore() {
  return QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: qdrantConfig.url,
      collectionName:
        qdrantConfig.collectionName,

      contentPayloadKey: "pageContent",
      metadataPayloadKey: "metadata",
    }
  );
}
