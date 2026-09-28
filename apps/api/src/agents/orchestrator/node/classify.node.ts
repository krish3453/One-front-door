import { z } from "zod";

import type { AgentStateType } from "../state.js";

import { createLLM } from "../../../llm/factory.js";

const ClassificationSchema =
  z.object({
    route: z.enum([
      "academic",
      "campus",
      "general",
    ]),
  });

const llm =
  createLLM("classifier");

console.log(
  "[Classifier] LLM initialized"
);

export async function classifyNode(
  state: AgentStateType
) {
  console.log(
    `\n[Classifier] Question: ${state.question}`
  );

  const structuredLLM =
    llm.withStructuredOutput(
      ClassificationSchema
    );

  const result =
    await structuredLLM.invoke([
      {
        role: "system",

        content: `
You are the routing classifier for
"One Front Door", a university AI assistant.

Your ONLY task is to classify the user's
question into exactly ONE category.

Available categories:

1. academic

Use "academic" when the question concerns
the university's academic system.

Examples:
- courses
- subjects
- attendance
- exams
- grades
- marks
- assignments
- curriculum
- semester information
- faculty
- academic policies
- academic schedules
- university course requirements

Examples:

"What is my attendance requirement?"
-> academic

"When is the CSE214 exam?"
-> academic

"What topics are in my CSE214 syllabus?"
-> academic


2. campus

Use "campus" when the question concerns
physical campus facilities or student-life
services.

Examples:
- library
- hostel
- campus facilities
- campus events
- clubs
- cafeteria
- food
- transportation
- campus services
- buildings
- locations
- offices
- opening hours of campus facilities

Examples:

"Where is the library?"
-> campus

"What time does the library open?"
-> campus

"Where is the hostel?"
-> campus

"When does the cafeteria close?"
-> campus


3. general

Use "general" for everything else.

Examples:

"Explain recursion"
-> general

"What is a binary tree?"
-> general

"How does TCP work?"
-> general

"Explain machine learning"
-> general


IMPORTANT RULES:

- Classify the CURRENT question.
- The current question may already have been
  resolved from a previous conversation.
- Do not classify based only on vague words.
- If the question explicitly refers to a
  university facility or campus service,
  classify it as campus.
- A general computer science concept is NOT
  academic unless it explicitly concerns the
  user's university course, subject, class,
  exam, assignment, or curriculum.
- When uncertain between academic and general,
  choose general unless there is explicit
  university/course context.

Return ONLY the structured classification.
`,
      },

      {
        role: "user",

        content:
          state.question,
      },
    ]);

  console.log(
    "[Classifier] Result:",
    result
  );

  return {
    route:
      result.route,
  };
}