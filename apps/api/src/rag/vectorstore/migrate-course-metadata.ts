import "dotenv/config";

import { QdrantClient } from "@qdrant/js-client-rest";
import { loadRAGChunks } from "../ingestion/build-documents.js";

const client = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
});

const collectionName =
  process.env.QDRANT_COLLECTION || "one_front_door_knowledge";

const chunks = await loadRAGChunks();

console.log(`Prepared chunks: ${chunks.length}`);

const preparedByContent = new Map<
  string,
  (typeof chunks)[number]
>();

for (const chunk of chunks) {
  preparedByContent.set(chunk.pageContent, chunk);
}

let offset: string | number | null = null;
let scanned = 0;
let updated = 0;
let skipped = 0;

while (true) {
  const result = await client.scroll(collectionName, {
    limit: 100,
    offset,
    with_payload: true,
    with_vector: false,
  });

  const points = result.points;

  for (const point of points) {
    scanned++;

    const payload = point.payload as
      | {
          pageContent?: string;
          metadata?: Record<string, unknown>;
        }
      | undefined;

    const pageContent = payload?.pageContent;

    if (!pageContent) {
      skipped++;
      continue;
    }

    const chunk = preparedByContent.get(pageContent);

    if (!chunk) {
      skipped++;
      continue;
    }

    const existingMetadata = payload?.metadata ?? {};

    const newMetadata = {
      ...existingMetadata,
      ...chunk.metadata,
    };

    await client.setPayload(collectionName, {
      points: [point.id],
      payload: {
        metadata: newMetadata,
      },
    });

    updated++;

    if (updated % 100 === 0) {
      console.log(`Updated ${updated} points...`);
    }
  }

  const nextPageOffset = result.next_page_offset;

  if (
    nextPageOffset === null ||
    nextPageOffset === undefined ||
    typeof nextPageOffset === "string" ||
    typeof nextPageOffset === "number"
  ) {
    offset = nextPageOffset ?? null;
  } else {
    throw new Error("Qdrant returned an unsupported page offset.");
  }

  if (offset === null) {
    break;
  }
}

console.log("\n==============================");
console.log("METADATA MIGRATION COMPLETE");
console.log("==============================");
console.log(`Scanned: ${scanned}`);
console.log(`Updated: ${updated}`);
console.log(`Skipped: ${skipped}`);