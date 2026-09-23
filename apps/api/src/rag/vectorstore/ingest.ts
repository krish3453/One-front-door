import "dotenv/config";

import crypto from "node:crypto";

import type { Document } from "@langchain/core/documents";
import { QdrantClient } from "@qdrant/js-client-rest";

import {
  loadRAGChunks,
} from "../ingestion/build-documents.js";

import {
  createEmbeddings,
} from "../embeddings/embedding-model.js";

import {
  qdrantConfig,
} from "./qdrant.js";

const BATCH_SIZE = 10;

const DELAY_BETWEEN_BATCHES_MS = 15_000;

const MAX_RATE_LIMIT_RETRIES = 2;

const RATE_LIMIT_RETRY_DELAY_MS = 10_000;

const START_BATCH = 90;

const EXPECTED_VECTOR_SIZE = 3072;

const FAILED_EMBEDDINGS_FILE =
  "D:/one-front-door/data/processed/failed-embeddings.json";

const embeddings = createEmbeddings();

const qdrantClient = new QdrantClient({
  url: qdrantConfig.url,
});


/* =========================================================
   Utility
========================================================= */

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}


/* =========================================================
   Deterministic Qdrant point ID
========================================================= */

function createPointId(document: Document): string {
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


/* =========================================================
   Error helpers
========================================================= */

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}


function isRateLimitError(error: unknown): boolean {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return false;
  }

  const errorObject = error as {
    status?: number;
    response?: {
      status?: number;
    };
  };

  if (errorObject.status === 429) {
    return true;
  }

  if (
    errorObject.response?.status === 429
  ) {
    return true;
  }

  return false;
}


/* =========================================================
   Validate embeddings
========================================================= */

function validateEmbeddings(
  vectors: number[][],
  expectedCount: number
): void {
  if (vectors.length !== expectedCount) {
    throw new Error(
      `Embedding count mismatch. Expected ${expectedCount}, received ${vectors.length}.`
    );
  }

  for (let i = 0; i < vectors.length; i++) {
    const vector = vectors[i];

    if (
      !Array.isArray(vector) ||
      vector.length === 0
    ) {
      throw new Error(
        `Empty embedding returned for batch item ${i}.`
      );
    }

    if (
      vector.length !== EXPECTED_VECTOR_SIZE
    ) {
      throw new Error(
        `Invalid embedding dimension for batch item ${i}. Expected ${EXPECTED_VECTOR_SIZE}, received ${vector.length}.`
      );
    }

    const hasInvalidValue = vector.some(
      (value) => !Number.isFinite(value)
    );

    if (hasInvalidValue) {
      throw new Error(
        `Embedding for batch item ${i} contains an invalid numeric value.`
      );
    }
  }
}


/* =========================================================
   Failed embedding tracking
========================================================= */

interface FailedEmbedding {
  index: number;
  source?: string;
  page?: number;
  documentType?: string;
  extractionMethod?: string;
  preview: string;
  error: string;
}


async function saveFailedEmbedding(
  document: Document,
  index: number,
  error: unknown
): Promise<void> {
  const fs = await import("node:fs/promises");

  let existing: FailedEmbedding[] = [];

  try {
    const content = await fs.readFile(
      FAILED_EMBEDDINGS_FILE,
      "utf8"
    );

    existing = JSON.parse(content);
  } catch {
    existing = [];
  }

  const failure: FailedEmbedding = {
    index,

    source:
      typeof document.metadata.source === "string"
        ? document.metadata.source
        : undefined,

    page:
      typeof document.metadata.page === "number"
        ? document.metadata.page
        : undefined,

    documentType:
      typeof document.metadata.documentType === "string"
        ? document.metadata.documentType
        : undefined,

    extractionMethod:
      typeof document.metadata.extractionMethod === "string"
        ? document.metadata.extractionMethod
        : undefined,

    preview:
      document.pageContent.slice(0, 300),

    error: getErrorMessage(error),
  };

  const alreadyExists = existing.some(
    (item) =>
      item.index === failure.index &&
      item.source === failure.source &&
      item.page === failure.page
  );

  if (!alreadyExists) {
    existing.push(failure);
  }

  await fs.writeFile(
    FAILED_EMBEDDINGS_FILE,
    JSON.stringify(existing, null, 2),
    "utf8"
  );
}


/* =========================================================
   Embed a batch
========================================================= */

async function embedBatch(
  documents: Document[]
): Promise<number[][]> {
  let rateLimitAttempt = 0;

  while (true) {
    try {
      console.log(
        `Requesting embeddings for ${documents.length} chunks...`
      );

      const vectors =
        await embeddings.embedDocuments(
          documents.map(
            (document) =>
              document.pageContent
          )
        );

      validateEmbeddings(
        vectors,
        documents.length
      );

      return vectors;
    } catch (error) {
      if (!isRateLimitError(error)) {
        throw error;
      }

      rateLimitAttempt++;

      if (
        rateLimitAttempt >
        MAX_RATE_LIMIT_RETRIES
      ) {
        throw new Error(
          `Rate limit persisted after ${MAX_RATE_LIMIT_RETRIES} retries.\n${getErrorMessage(error)}`
        );
      }

      const delay =
        RATE_LIMIT_RETRY_DELAY_MS *
        rateLimitAttempt;

      console.log(
        `Rate limit detected. Waiting ${
          delay / 1000
        } seconds before retry...`
      );

      await sleep(delay);
    }
  }
}


/* =========================================================
   Robust embedding

   Strategy:

   Try entire batch
        ↓
   success → return vectors

   failure
        ↓
   split batch
        ↓
   try smaller batches
        ↓
   eventually individual chunks
        ↓
   failed individual chunk → record and skip
========================================================= */

interface EmbeddedDocument {
  document: Document;
  vector: number[];
  originalIndex: number;
}


async function embedRobustly(
  documents: Document[],
  originalStartIndex: number
): Promise<EmbeddedDocument[]> {
  if (documents.length === 0) {
    return [];
  }

  try {
    const vectors = await embedBatch(documents);

    return documents.map(
      (document, index) => ({
        document,
        vector: vectors[index],
        originalIndex:
          originalStartIndex + index,
      })
    );
  } catch (error) {
    console.log(
      `Batch of ${documents.length} chunks failed.`
    );

    console.log(
      `Reason: ${getErrorMessage(error)}`
    );

    /*
     * If this is already one document,
     * try it using embedQuery().
     */
    if (documents.length === 1) {
      const document = documents[0];

      const absoluteIndex =
        originalStartIndex;

      console.log(
        `Trying individual embedding for chunk ${absoluteIndex}...`
      );

      try {
        const vector =
          await embeddings.embedQuery(
            document.pageContent
          );

        if (
          !Array.isArray(vector) ||
          vector.length === 0
        ) {
          throw new Error(
            "Individual embedding returned an empty vector."
          );
        }

        if (
          vector.length !==
          EXPECTED_VECTOR_SIZE
        ) {
          throw new Error(
            `Individual embedding has ${vector.length} dimensions. Expected ${EXPECTED_VECTOR_SIZE}.`
          );
        }

        console.log(
          `Individual embedding succeeded for chunk ${absoluteIndex}.`
        );

        return [
          {
            document,
            vector,
            originalIndex:
              absoluteIndex,
          },
        ];
      } catch (individualError) {
        console.log(
          `Individual embedding failed for chunk ${absoluteIndex}.`
        );

        console.log(
          `Reason: ${getErrorMessage(individualError)}`
        );

        await saveFailedEmbedding(
          document,
          absoluteIndex,
          individualError
        );

        console.log(
          `Chunk ${absoluteIndex} recorded in failed-embeddings.json.`
        );

        return [];
      }
    }

    /*
     * Split the failed batch in half.
     */
    const midpoint =
      Math.ceil(documents.length / 2);

    const firstHalf =
      documents.slice(
        0,
        midpoint
      );

    const secondHalf =
      documents.slice(
        midpoint
      );

    console.log(
      `Splitting ${documents.length} chunks into ${firstHalf.length} + ${secondHalf.length}.`
    );

    const firstResults =
      await embedRobustly(
        firstHalf,
        originalStartIndex
      );

    const secondResults =
      await embedRobustly(
        secondHalf,
        originalStartIndex + midpoint
      );

    return [
      ...firstResults,
      ...secondResults,
    ];
  }
}


/* =========================================================
   Qdrant collection
========================================================= */

async function ensureCollection(): Promise<void> {
  const collections =
    await qdrantClient.getCollections();

  const exists =
    collections.collections.some(
      (collection) =>
        collection.name ===
        qdrantConfig.collectionName
    );

  if (exists) {
    console.log(
      `Qdrant collection already exists: ${qdrantConfig.collectionName}`
    );

    return;
  }

  console.log(
    `Creating Qdrant collection: ${qdrantConfig.collectionName}`
  );

  await qdrantClient.createCollection(
    qdrantConfig.collectionName,
    {
      vectors: {
        size: EXPECTED_VECTOR_SIZE,
        distance: "Cosine",
      },
    }
  );

  console.log(
    "Qdrant collection created."
  );
}


/* =========================================================
   Store vectors in Qdrant
========================================================= */

async function storeDocuments(
  embeddedDocuments: EmbeddedDocument[]
): Promise<void> {
  if (embeddedDocuments.length === 0) {
    return;
  }

  const points =
    embeddedDocuments.map(
      ({
        document,
        vector,
      }) => ({
        id: createPointId(
          document
        ),

        vector,

        payload: {
          pageContent:
            document.pageContent,

          metadata:
            document.metadata,
        },
      })
    );

  for (
    let i = 0;
    i < points.length;
    i++
  ) {
    const vector =
      points[i].vector;

    if (
      !Array.isArray(vector) ||
      vector.length !==
        EXPECTED_VECTOR_SIZE
    ) {
      throw new Error(
        `Invalid vector at point ${i}. Expected ${EXPECTED_VECTOR_SIZE} dimensions.`
      );
    }
  }

  await qdrantClient.upsert(
    qdrantConfig.collectionName,
    {
      wait: true,
      points,
    }
  );

  console.log(
    `Stored ${points.length} vectors in Qdrant.`
  );
}


/* =========================================================
   Ingest one batch
========================================================= */

async function ingestBatch(
  documents: Document[],
  batchNumber: number,
  totalBatches: number,
  globalStartIndex: number
): Promise<void> {
  console.log(
    "\n=============================="
  );

  console.log(
    `Embedding batch ${batchNumber}/${totalBatches}`
  );

  console.log(
    `Chunks in batch: ${documents.length}`
  );

  console.log(
    `Chunk indexes: ${globalStartIndex} - ${
      globalStartIndex +
      documents.length -
      1
    }`
  );

  const embeddedDocuments =
    await embedRobustly(
      documents,
      globalStartIndex
    );

  console.log(
    `Successfully embedded ${embeddedDocuments.length}/${documents.length} chunks.`
  );

  if (
    embeddedDocuments.length === 0
  ) {
    console.log(
      "No valid embeddings in this batch. Continuing."
    );

    return;
  }

  await ensureCollection();

  await storeDocuments(
    embeddedDocuments
  );

  console.log(
    `Batch ${batchNumber}/${totalBatches} completed.`
  );
}


/* =========================================================
   Main
========================================================= */

async function main(): Promise<void> {
  console.log(
    "\n=============================="
  );

  console.log(
    "RAG VECTOR INGESTION"
  );

  console.log(
    "=============================="
  );

  console.log(
    `\nQdrant URL: ${qdrantConfig.url}`
  );

  console.log(
    `Collection: ${qdrantConfig.collectionName}`
  );

  console.log(
    `Batch size: ${BATCH_SIZE}`
  );

  console.log(
    `Starting from batch: ${START_BATCH}`
  );

  console.log(
    `Delay between batches: ${
      DELAY_BETWEEN_BATCHES_MS / 1000
    } seconds`
  );

  console.log(
    "\nLoading prepared chunks..."
  );

  const documents =
    await loadRAGChunks();

  console.log(
    `Loaded ${documents.length} prepared chunks.`
  );

  if (documents.length === 0) {
    throw new Error(
      "No prepared chunks found."
    );
  }

  const totalBatches =
    Math.ceil(
      documents.length /
        BATCH_SIZE
    );

  console.log(
    `Total batches: ${totalBatches}`
  );

  const startIndex =
    (START_BATCH - 1) *
    BATCH_SIZE;

  console.log(
    `Starting from chunk index: ${startIndex}`
  );

  /*
   * Make sure the collection exists
   * before ingestion begins.
   */
  await ensureCollection();

  for (
    let i = startIndex;
    i < documents.length;
    i += BATCH_SIZE
  ) {
    const batch =
      documents.slice(
        i,
        i + BATCH_SIZE
      );

    const batchNumber =
      Math.floor(
        i / BATCH_SIZE
      ) + 1;

    await ingestBatch(
      batch,
      batchNumber,
      totalBatches,
      i
    );

    if (
      batchNumber <
      totalBatches
    ) {
      console.log(
        `Waiting ${
          DELAY_BETWEEN_BATCHES_MS / 1000
        } seconds before next batch...`
      );

      await sleep(
        DELAY_BETWEEN_BATCHES_MS
      );
    }
  }

  console.log(
    "\n=============================="
  );

  console.log(
    "RAG VECTOR INGESTION COMPLETED"
  );

  console.log(
    "=============================="
  );

  console.log(
    `Failed embeddings, if any, are recorded at: ${FAILED_EMBEDDINGS_FILE}`
  );
}


await main();