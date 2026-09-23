import { graph } from "./graph.js";

const result = await graph.invoke({
  question: "What is my name?",
});

console.log("\nGraph result:");
console.log(result);