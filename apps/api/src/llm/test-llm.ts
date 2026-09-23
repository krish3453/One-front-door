import { createLLM } from "./factory.js";

const llm = createLLM();

const response = await llm.invoke(
  "Reply with exactly: LLM connection successful"
);

console.log(response.content);