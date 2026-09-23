import path from "node:path";

import { Document } from "@langchain/core/documents";

export type DocumentType =
  | "syllabus"
  | "examination_manual"
  | "attendance_notification"
  | "discipline_rules"
  | "brochure"
  | "unknown";

export type ExtractionMethod =
  | "pdf"
  | "ocr";

export interface RAGMetadata {
  source: string;
  page?: number;
  documentType: DocumentType;
  extractionMethod: ExtractionMethod;
}

function getDocumentType(
  fileName: string
): DocumentType {
  const normalized = fileName.toLowerCase();

  if (
    normalized.includes("syllabus")
  ) {
    return "syllabus";
  }

  if (
    normalized.includes("examination") &&
    normalized.includes("manual")
  ) {
    return "examination_manual";
  }

  if (
    normalized.includes("attendance")
  ) {
    return "attendance_notification";
  }

  if (
    normalized.includes("discipline") ||
    normalized.includes("conduct")
  ) {
    return "discipline_rules";
  }

  if (
    normalized.includes("brochure")
  ) {
    return "brochure";
  }

  return "unknown";
}

function getPageNumber(
  document: Document
): number | undefined {
  /*
   * OCR documents already have:
   *
   * metadata.page
   */

  if (
    typeof document.metadata.page === "number"
  ) {
    return document.metadata.page;
  }

  /*
   * PDFLoader documents have:
   *
   * metadata.loc.pageNumber
   */

  const pageNumber =
    document.metadata.loc?.pageNumber;

  if (typeof pageNumber === "number") {
    return pageNumber;
  }

  return undefined;
}

function getExtractionMethod(
  document: Document
): ExtractionMethod {
  if (
    document.metadata.extractionMethod === "ocr"
  ) {
    return "ocr";
  }

  return "pdf";
}

export function enrichDocumentMetadata(
  document: Document
): Document {
  const sourcePath =
    typeof document.metadata.source === "string"
      ? document.metadata.source
      : "";

  const source = path.basename(sourcePath);

  const metadata: RAGMetadata = {
    source,
    page: getPageNumber(document),
    documentType: getDocumentType(source),
    extractionMethod:
      getExtractionMethod(document),
  };

  return new Document({
    pageContent: document.pageContent,
    metadata,
  });
}

export function enrichDocumentsMetadata(
  documents: Document[]
): Document[] {
  return documents.map(
    enrichDocumentMetadata
  );
}