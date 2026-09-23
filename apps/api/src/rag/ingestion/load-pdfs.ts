import fs from "node:fs/promises";
import path from "node:path";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

import { loadPDFWithOCR } from "./ocr-loader.js";

const DOCUMENTS_DIR = path.resolve(
  process.cwd(),
  "../../data/documents"
);

const MIN_TEXT_LENGTH = 100;

async function loadPDF(filePath: string, fileName: string) {
  console.log(`\nLoading: ${fileName}`);

  const loader = new PDFLoader(filePath);

  const documents = await loader.load();

  const totalCharacters = documents.reduce(
    (total, document) =>
      total + document.pageContent.trim().length,
    0
  );

  console.log(
    `PDF text extraction: ${documents.length} pages, ${totalCharacters} characters`
  );

  if (totalCharacters >= MIN_TEXT_LENGTH) {
    console.log("Extraction method: PDF text");

    return documents;
  }

  console.log(
    "Little or no text found. Falling back to OCR..."
  );

  const ocrDocuments = await loadPDFWithOCR(
    filePath,
    fileName
  );

  console.log(
    `OCR extraction: ${ocrDocuments.length} pages`
  );

  return ocrDocuments;
}

async function loadPDFs() {
  const files = await fs.readdir(DOCUMENTS_DIR);

  const pdfFiles = files.filter((file) =>
    file.toLowerCase().endsWith(".pdf")
  );

  console.log(`Found ${pdfFiles.length} PDF files.`);

  for (const file of pdfFiles) {
    const filePath = path.join(DOCUMENTS_DIR, file);

    const documents = await loadPDF(
      filePath,
      file
    );

    const totalCharacters = documents.reduce(
      (total, document) =>
        total + document.pageContent.length,
      0
    );

    console.log(
      `Final documents: ${documents.length}`
    );

    console.log(
      `Final characters: ${totalCharacters}`
    );

    if (documents.length > 0) {
      console.log(
        `Preview:\n${documents[0].pageContent.slice(
          0,
          300
        )}`
      );
    }
  }
}

await loadPDFs();