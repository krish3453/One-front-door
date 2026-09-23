import {
  buildRAGDocuments,
  saveRAGChunks,
} from "./build-documents.js";

console.log("\n==============================");
console.log("RAG DOCUMENT PREPARATION");
console.log("==============================");

const chunks =
  await buildRAGDocuments();

await saveRAGChunks(chunks);

console.log(
  "\nDocument preparation completed."
);