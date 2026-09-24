import { graph } from "./graph.js";

const result = await graph.invoke({
  question: "Where is the library and what is recursion?",
});

console.log("\nGraph result:");
console.log(result);