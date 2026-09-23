import {
  retrieveDocuments,
} from "./retriever.js";

const query =
  "What is the minimum attendance required for the end semester examination?";

const results =
  await retrieveDocuments(
    query,
    {
        k:5
    }
    
  );

console.log(
  "\n=============================="
);

console.log(
  "RETRIEVER TEST"
);

console.log(
  "=============================="
);

console.log(
  `\nQuery: ${query}`
);

console.log(
  `Results: ${results.length}`
);

results.forEach(
  (result, index) => {
    console.log(
      `\n--- RESULT ${index + 1} ---`
    );

    console.log(
      "Source:",
      result.source
    );

    console.log(
      "Page:",
      result.page
    );

    console.log(
      "Type:",
      result.documentType
    );

    console.log(
      "Extraction:",
      result.extractionMethod
    );

    console.log(
      "\nContent:"
    );

    console.log(
      result.content
    );
  }
);