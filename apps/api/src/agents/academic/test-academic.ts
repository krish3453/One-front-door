import { academicNode } from "./academic.node.js";
import type { AgentStateType } from "../orchestrator/state.js";

async function main() {
  const result = await academicNode({
    question: "whats the syllabus of ballb",
    userId: "test-user",
  } as AgentStateType);

  console.log("\nAcademic Agent Result:");
  console.log(result.response);
  if (result.sources && result.sources.length > 0) {
    console.log("\nSources:");
    console.log(result.sources);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
