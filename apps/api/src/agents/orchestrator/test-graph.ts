import { graph } from "./graph.js";

const result = await graph.invoke({
  question: "WWhat food outlets are available on campus?",
});

console.log("\nGraph result:");
console.log(result);