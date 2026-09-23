import "dotenv/config";

import { QdrantClient } from "@qdrant/js-client-rest";
import crypto from "node:crypto";
import { loadRAGChunks } from "../ingestion/build-documents.js";

const client = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
});

const collectionName =
  process.env.QDRANT_COLLECTION || "one_front_door_knowledge";

function createPointId(document: any): string {
  const input = JSON.stringify({
    pageContent: document.pageContent,
    metadata: document.metadata,
  });

  const hash = crypto
    .createHash("sha256")
    .update(input)
    .digest("hex");

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}

const chunks = await loadRAGChunks();

console.log(`Loaded ${chunks.length} prepared chunks.`);

let updated = 0;

for (const chunk of chunks) {
  const pointId = createPointId(chunk);

  await client.setPayload(collectionName, {
    payload: {
      metadata: chunk.metadata,
    },
    points: [pointId],
  });

  updated++;

  if (updated % 100 === 0) {
    console.log(`Updated metadata for ${updated}/${chunks.length}`);
  }
}

console.log(`Updated metadata for ${updated} chunks.`);