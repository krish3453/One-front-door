import {
  loadRAGChunks,
} from "./build-documents.js";

const documents =
  await loadRAGChunks();

const start = 880;
const end = 890;

console.log(
  `Inspecting chunks ${start} to ${end - 1}`
);

for (
  let i = start;
  i < end;
  i++
) {
  const document = documents[i];

  console.log(
    "\n=============================="
  );

  console.log(
    `Chunk index: ${i}`
  );

  console.log(
    `Characters: ${document.pageContent.length}`
  );

  console.log(
    `Trimmed characters: ${
      document.pageContent.trim().length
    }`
  );

  console.log(
    "Metadata:"
  );

  console.log(
    document.metadata
  );

  console.log(
    "\nContent:"
  );

  console.log(
    document.pageContent.slice(
      0,
      500
    )
  );
}