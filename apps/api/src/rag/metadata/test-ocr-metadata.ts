import path from "node:path";

import { loadPDFWithOCR } from "../ingestion/ocr-loader.js";
import {
  enrichDocumentMetadata,
} from "./enrich-metadata.js";

const fileName =
  "Notification-for-Minimum-Attendance-for-Students.pdf";

const filePath = path.resolve(
  process.cwd(),
  "../../data/documents",
  fileName
);

const documents = await loadPDFWithOCR(
  filePath,
  fileName
);

const enrichedDocument =
  enrichDocumentMetadata(documents[0]);

console.log("\n==============================");
console.log("OCR METADATA TEST");
console.log("==============================");

console.log("\nContent:");
console.log(
  enrichedDocument.pageContent.slice(0, 500)
);

console.log("\nMetadata:");
console.log(enrichedDocument.metadata);