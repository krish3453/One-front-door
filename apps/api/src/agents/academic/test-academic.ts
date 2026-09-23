import {
  academicNode,
} from "./academic.node.js";

const result =
  await academicNode({
    question:
      "What is the minimum attendance required for the end semester examination?",

    route: "academic",

    response: undefined,

    sources: undefined,
  });

console.log(
  "\n=============================="
);

console.log(
  "ACADEMIC AGENT TEST"
);

console.log(
  "=============================="
);

console.log(
  "\nAnswer:"
);

console.log(
  result.response
);

console.log(
  "\nSources:"
);

console.dir(
  result.sources,
  {
    depth: null,
  }
);