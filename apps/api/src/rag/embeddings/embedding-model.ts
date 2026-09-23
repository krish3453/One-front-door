import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

export function createEmbeddings() {
  return new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: process.env.GOOGLE_API_KEY,
  });
}