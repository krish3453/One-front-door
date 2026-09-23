import path from "node:path";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

import {
  enrichDocumentMetadata,
} from "./enrich-metadata.js";

const fileName =
  "BTech-Detailed-Syllabus_2022_compressed-1.pdf";

const filePath = path.resolve(
  process.cwd(),
  "../../data/documents",
  fileName
);

const loader = new PDFLoader(filePath);

const documents = await loader.load();

const enrichedDocument =
  enrichDocumentMetadata(documents[250]);

console.log("\n==============================");
console.log("METADATA TEST");
console.log("==============================");

console.log("\nContent:");
console.log(
  enrichedDocument.pageContent.slice(0, 300)
);

console.log("\nMetadata:");
console.log(enrichedDocument.metadata);