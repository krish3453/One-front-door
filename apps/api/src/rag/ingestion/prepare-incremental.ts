/**
 * Incremental RAG preparation script.
 *
 * Instead of re-processing ALL documents, this script:
 * 1. Loads only the specified new PDF files
 * 2. Chunks them
 * 3. Merges the new chunks with the existing rag-chunks.json
 *
 * Usage:
 *   npx tsx src/rag/ingestion/prepare-incremental.ts <file1.pdf> [file2.pdf ...]
 */

import fs from "node:fs/promises";
import path from "node:path";

import {
  PDFLoader,
} from "@langchain/community/document_loaders/fs/pdf";

import { Document } from "@langchain/core/documents";

import { loadPDFWithOCR } from "./ocr-loader.js";

import {
  enrichDocumentsMetadata,
} from "../metadata/enrich-metadata.js";

import {
  chunkDocuments,
} from "../chunking/chunk-documents.js";

const DOCUMENTS_DIR = path.resolve(
  process.cwd(),
  "../../data/documents"
);

const PROCESSED_DIR = path.resolve(
  process.cwd(),
  "../../data/processed"
);

const CHUNKS_FILE = path.join(
  PROCESSED_DIR,
  "rag-chunks.json"
);

const MIN_TEXT_LENGTH = 100;

async function loadSinglePDF(
  filePath: string,
  fileName: string
): Promise<Document[]> {
  console.log(`\nLoading: ${fileName}`);

  const loader = new PDFLoader(filePath);

  const documents = await loader.load();

  const totalCharacters = documents.reduce(
    (total, document) =>
      total +
      document.pageContent.trim().length,
    0
  );

  if (totalCharacters >= MIN_TEXT_LENGTH) {
    console.log(
      `Using PDF text extraction: ${documents.length} pages`
    );

    return documents;
  }

  console.log(
    "Little or no text found. Using OCR..."
  );

  return loadPDFWithOCR(
    filePath,
    fileName
  );
}


async function loadExistingChunks(): Promise<Document[]> {
  try {
    const raw = await fs.readFile(
      CHUNKS_FILE,
      "utf-8"
    );

    const chunks = JSON.parse(raw) as Array<{
      pageContent: string;
      metadata: Record<string, unknown>;
    }>;

    return chunks.map(
      (chunk) =>
        new Document({
          pageContent: chunk.pageContent,
          metadata: chunk.metadata,
        })
    );
  } catch {
    return [];
  }
}


async function main(): Promise<void> {
  const fileArgs = process.argv.slice(2);

  if (fileArgs.length === 0) {
    console.error(
      "Usage: npx tsx src/rag/ingestion/prepare-incremental.ts <file1.pdf> [file2.pdf ...]"
    );

    process.exit(1);
  }

  console.log("\n==============================");
  console.log("INCREMENTAL RAG PREPARATION");
  console.log("==============================");

  const allNewDocuments: Document[] = [];

  for (const fileName of fileArgs) {
    const filePath = path.join(
      DOCUMENTS_DIR,
      fileName
    );

    try {
      await fs.access(filePath);
    } catch {
      console.error(
        `File not found: ${filePath}`
      );

      process.exit(1);
    }

    const documents =
      await loadSinglePDF(
        filePath,
        fileName
      );

    allNewDocuments.push(...documents);
  }

  console.log(
    `\nLoaded ${allNewDocuments.length} pages from ${fileArgs.length} new file(s).`
  );

  const enrichedDocuments =
    enrichDocumentsMetadata(
      allNewDocuments
    );

  console.log(
    "Metadata enrichment complete."
  );

  const newChunks =
    await chunkDocuments(
      enrichedDocuments
    );

  console.log(
    `Generated ${newChunks.length} new chunks.`
  );

  /* Load existing chunks and merge */
  const existingChunks =
    await loadExistingChunks();

  console.log(
    `Existing chunks: ${existingChunks.length}`
  );

  const mergedChunks = [
    ...existingChunks,
    ...newChunks,
  ];

  console.log(
    `Total after merge: ${mergedChunks.length}`
  );

  /* Save merged chunks */
  await fs.mkdir(
    PROCESSED_DIR,
    { recursive: true }
  );

  const serialized = mergedChunks.map(
    (document) => ({
      pageContent:
        document.pageContent,

      metadata:
        document.metadata,
    })
  );

  await fs.writeFile(
    CHUNKS_FILE,
    JSON.stringify(
      serialized,
      null,
      2
    ),
    "utf-8"
  );

  console.log(
    `\nSaved ${mergedChunks.length} chunks to:`
  );

  console.log(CHUNKS_FILE);

  console.log(
    "\nIncremental preparation complete."
  );
}

await main();
