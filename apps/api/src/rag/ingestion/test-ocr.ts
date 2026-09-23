import path from "node:path";

import { loadPDFWithOCR } from "./ocr-loader.js";

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

console.log("\n==============================");
console.log("OCR TEST RESULT");
console.log("==============================");

console.log("Pages extracted:", documents.length);

for (const document of documents) {
  console.log("\n--- Page", document.metadata.page, "---");
  console.log(document.pageContent);
}