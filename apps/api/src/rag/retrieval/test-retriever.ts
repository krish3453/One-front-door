import { retrieveDocuments } from "./retriever.js";

const queries = [
  "What is the minimum attendance required for the end semester examination?",
  "What are the modules in CSET101?",
  "What is CSET101?",
];

console.log("\n==============================");
console.log("RETRIEVER TEST");
console.log("==============================");

for (const query of queries) {
  console.log(`\nQuery: ${query}`);

  const results = await retrieveDocuments(query, {
    k: 5,
  });

  console.log(`Results: ${results.length}`);

  results.forEach((result, index) => {
    console.log(`\n--- RESULT ${index + 1} ---`);
    console.log(`Source: ${result.source}`);
    console.log(`Page: ${result.page ?? "N/A"}`);
    console.log(`Type: ${result.documentType}`);
    console.log(`Extraction: ${result.extractionMethod}`);
    console.log(`Content:\n${result.content}`);
  });
}