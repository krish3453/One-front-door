import {
  buildRAGDocuments,
} from "./build-documents.js";

const chunks =
  await buildRAGDocuments();

console.log("\n==============================");
console.log("RAG PIPELINE TEST");
console.log("==============================");

console.log(
  "Total chunks:",
  chunks.length
);

console.log("\nFirst chunk:");

console.log(
  chunks[0].pageContent
);

console.log("\nMetadata:");

console.log(
  chunks[0].metadata
);

console.log("\nLast chunk metadata:");

console.log(
  chunks[chunks.length - 1].metadata
);