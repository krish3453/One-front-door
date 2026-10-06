import fs from "node:fs";
import path from "node:path";

export function getDataDir(): string {
  if (process.env.DATA_DIR && fs.existsSync(process.env.DATA_DIR)) {
    return process.env.DATA_DIR;
  }

  const candidates = [
    path.resolve(process.cwd(), "data"),
    path.resolve(process.cwd(), "../data"),
    path.resolve(process.cwd(), "../../data"),
    "/app/data",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), "../../data");
}

export const DATA_DIR = getDataDir();
export const DOCUMENTS_DIR = path.join(DATA_DIR, "documents");
export const PROCESSED_DIR = path.join(DATA_DIR, "processed");
export const CHUNKS_FILE = path.join(PROCESSED_DIR, "rag-chunks.json");
export const CATALOG_FILE = path.join(PROCESSED_DIR, "curriculum-catalog.json");
