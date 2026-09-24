import { graph } from "./graph.js";

const result = await graph.invoke({
  question: "What food outlets are available on campus?",
});

console.log("\nGraph result:");
console.log(result);