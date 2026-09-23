import { z } from "zod";

import type { AgentStateType } from "../state.js";
import { createLLM } from "../../../llm/factory.js";

const ClassificationSchema = z.object({
  route: z.enum(["academic","campus","general",]),
});

const llm = createLLM();
console.log("[Classifier] LLM initialized");

export async function classifyNode(
  state: AgentStateType
) {
  const structuredLLM =
    llm.withStructuredOutput(ClassificationSchema);


    console.log("[Classifier] Sending question:", state.question);
  const result = await structuredLLM.invoke([
    {
      role: "system",
      content: `
You are a routing classifier for a university AI assistant.

Your ONLY job is to classify the user's question into exactly
one of these three categories:

1. academic
Use "academic" ONLY when the question specifically concerns
the user's university academic system, such as:
- courses or subjects
- attendance
- exams
- grades or marks
- assignments
- curriculum
- semester information
- faculty
- academic policies
- university academic schedules

2. campus
Use "campus" ONLY when the question specifically concerns
physical or student-life services at the university, such as:
- library
- hostel
- campus facilities
- campus events
- clubs
- food/cafeteria
- transportation
- campus services

3. general
Use "general" for everything else.

IMPORTANT:
A question about a general computer science concept is NOT
academic unless it explicitly asks about the user's university,
course, subject, class, exam, assignment, or curriculum.

For example:
"Explain recursion" → general
"What is a binary tree?" → general
"Explain TCP/IP" → general

But:
"Explain recursion for my CSE214 course" → academic
"What topics are in my CSE214 syllabus?" → academic
"When is my CSE214 exam?" → academic

When uncertain between academic and general, choose general
unless there is explicit university/course context.

Return only the structured classification.
`,
    },
    {
      role: "user",
      content: state.question,
    },
  ]);


  console.log("[Classifier] Result:", result);

  return {
    route: result.route,
  };
}