import { graph } from "./graph.js";

const result = await graph.invoke({
  question: "eplain recursuion in simple terms",
});

console.log("\nGraph result:");
console.log(result);