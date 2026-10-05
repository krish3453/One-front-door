import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { QdrantClient } from "@qdrant/js-client-rest";
import { qdrantConfig } from "./qdrant.js";
import { invalidateChatCache } from "../../lib/cache.js";

const TARGET_SOURCE = "BTech-Detailed-Syllabus_2022_compressed-1.pdf";
const CHUNKS_FILE = path.resolve(process.cwd(), "../../data/processed/rag-chunks.json");
const OLD_PDF_PATH = path.resolve(process.cwd(), `../../data/documents/${TARGET_SOURCE}`);
const BACKUP_DIR = path.resolve(process.cwd(), "../../data/documents/archive");

async function main() {
  console.log("\n========================================");
  console.log("DELETING SYLLABUS CHUNKS");
  console.log("========================================");

  const client = new QdrantClient({
    url: qdrantConfig.url,
  });

  // 1. Check points count before deletion
  const countBefore = await client.count(qdrantConfig.collectionName);
  console.log(`\n[Qdrant] Total points before deletion: ${countBefore.count}`);

  // 2. Delete points from Qdrant by source and documentType
  console.log(`[Qdrant] Deleting points for source: ${TARGET_SOURCE} ...`);
  const deleteResult = await client.delete(qdrantConfig.collectionName, {
    wait: true,
    filter: {
      should: [
        {
          key: "metadata.source",
          match: {
            value: TARGET_SOURCE,
          },
        },
        {
          key: "metadata.documentType",
          match: {
            value: "syllabus",
          },
        },
      ],
    },
  });

  console.log("[Qdrant] Delete result status:", deleteResult.status);

  const countAfter = await client.count(qdrantConfig.collectionName);
  console.log(`[Qdrant] Total points after deletion: ${countAfter.count}`);
  console.log(`[Qdrant] Removed ${countBefore.count - countAfter.count} points.`);

  // 3. Remove from data/processed/rag-chunks.json
  try {
    const rawChunks = await fs.readFile(CHUNKS_FILE, "utf-8");
    const chunks = JSON.parse(rawChunks) as Array<{
      pageContent: string;
      metadata: Record<string, unknown>;
    }>;

    const filteredChunks = chunks.filter(
      (c) =>
        c.metadata?.source !== TARGET_SOURCE &&
        c.metadata?.documentType !== "syllabus"
    );

    await fs.writeFile(
      CHUNKS_FILE,
      JSON.stringify(filteredChunks, null, 2),
      "utf-8"
    );

    console.log(
      `\n[rag-chunks.json] Cleaned file: reduced from ${chunks.length} to ${filteredChunks.length} chunks.`
    );
  } catch (error) {
    console.warn("[rag-chunks.json] Could not update rag-chunks.json:", error);
  }

  // 4. Archive old syllabus PDF so future build-documents won't reload it
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const backupTarget = path.join(BACKUP_DIR, TARGET_SOURCE);
    await fs.rename(OLD_PDF_PATH, backupTarget);
    console.log(`\n[Documents] Moved ${TARGET_SOURCE} to data/documents/archive/`);
  } catch (error) {
    console.warn(`[Documents] Note: Could not move ${TARGET_SOURCE}:`, error);
  }

  // 5. Invalidate Redis chat cache
  try {
    await invalidateChatCache();
    console.log("[Redis] Chat cache invalidated.");
  } catch (error) {
    console.warn("[Redis] Could not invalidate cache:", error);
  }

  console.log("\nSyllabus chunks deletion complete!");
}

main().catch((err) => {
  console.error("Deletion failed:", err);
  process.exit(1);
});
