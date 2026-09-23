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

export async function buildRAGDocuments(): Promise<Document[]> {
  const files = await fs.readdir(
    DOCUMENTS_DIR
  );

  const pdfFiles = files.filter(
    (file) =>
      file.toLowerCase().endsWith(".pdf")
  );

  console.log(
    `Found ${pdfFiles.length} PDF files.`
  );

  const allDocuments: Document[] = [];

  for (const file of pdfFiles) {
    const filePath = path.join(
      DOCUMENTS_DIR,
      file
    );

    const documents =
      await loadSinglePDF(
        filePath,
        file
      );

    allDocuments.push(...documents);
  }

  console.log(
    `\nLoaded documents: ${allDocuments.length}`
  );

  const enrichedDocuments =
    enrichDocumentsMetadata(
      allDocuments
    );

  console.log(
    "Metadata enrichment complete."
  );

  const chunks =
    await chunkDocuments(
      enrichedDocuments
    );

  console.log(
    `Generated chunks: ${chunks.length}`
  );

  return chunks;
}

export async function saveRAGChunks(
  chunks: Document[]
): Promise<void> {
  await fs.mkdir(
    PROCESSED_DIR,
    { recursive: true }
  );

  const serialized = chunks.map(
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
    `Saved ${chunks.length} chunks to:`
  );

  console.log(CHUNKS_FILE);
}

export async function loadRAGChunks(): Promise<Document[]> {
  const raw =
    await fs.readFile(
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
        pageContent:
          chunk.pageContent,

        metadata:
          chunk.metadata,
      })
  );
}