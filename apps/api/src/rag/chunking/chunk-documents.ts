import {
  RecursiveCharacterTextSplitter,
} from "@langchain/textsplitters";

import type { Document } from "@langchain/core/documents";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,
  chunkOverlap: 200,
  separators: [
    "\n\n",
    "\n",
    ". ",
    " ",
    "",
  ],
});

export async function chunkDocuments(
  documents: Document[]
): Promise<Document[]> {
  return splitter.splitDocuments(documents);
}