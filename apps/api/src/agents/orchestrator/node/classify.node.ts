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

Use "campus" when the question concerns:
a) University policies, student code of conduct, discipline rules, and campus regulations (alcohol policy, liquor, smoking, drugs, breathalyzer test, ragging, hostel curfew, gate pass, room inspection, misconduct, proctorial committee fines/punishments).
b) Physical campus facilities or student-life services (library, hostel, cafeteria, food, sports, transportation, medical center, buildings, locations, offices, emergency contacts).
c) Campus events, student clubs, security, and campus administration.

Examples of "campus":
- student code of conduct & discipline rules
- possession or consumption of alcohol / liquor on campus
- breathalyzer test at main gate
- smoking, tobacco, or illegal substance rules
- hostel rules, curfew timings, room changes, gate pass
- ragging and harassment policies
- library, cafeteria, sports complex, gym, medical room
- campus emergency contacts and security

Examples:

"Where is the library?"
-> campus

"What is the code of conduct for drinking alcohol in university?"
-> campus

"What happens if a student is caught with alcohol in the hostel?"
-> campus

"What are the hostel curfew timings?"
-> campus

"Can security check my bag at the main gate?"
-> campus

"When does the cafeteria close?"
-> campus


3. general

Use "general" for non-university questions, general conceptual explanations, greetings, or broader topics outside university campus life and academics.

Examples:

"Hello"
-> general

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
- If the question concerns campus facilities, student life, university policies,
  student code of conduct, discipline, alcohol, drugs, hostel rules, or campus safety,
  ALWAYS classify it as "campus".
- A general computer science concept is NOT
  academic unless it explicitly concerns the
  user's university course, subject, class,
  exam, assignment, or curriculum.
- When uncertain between academic and campus for university rules,
  choose "campus" for conduct/discipline/hostel/facilities and "academic" for courses/grades/exams.

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