import path from "node:path";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

import { chunkDocuments } from "./chunk-documents.js";

const fileName =
  "BTech-Detailed-Syllabus_2022_compressed-1.pdf";

const filePath = path.resolve(
  process.cwd(),
  "../../data/documents",
  fileName
);

const loader = new PDFLoader(filePath);

const documents = await loader.load();

console.log(
  `Original documents/pages: ${documents.length}`
);

const chunks = await chunkDocuments(documents);

console.log(
  `Generated chunks: ${chunks.length}`
);

console.log("\n==============================");
console.log("FIRST CHUNK");
console.log("==============================");

console.log(chunks[0].pageContent);

console.log("\nMetadata:");
console.log(chunks[0].metadata);

console.log("\n==============================");
console.log("SECOND CHUNK");
console.log("==============================");

console.log(chunks[1].pageContent);

console.log("\nMetadata:");
console.log(chunks[1].metadata);