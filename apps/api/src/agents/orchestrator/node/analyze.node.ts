import {
  createLLM,
} from "../../../llm/factory.js";

import type {
  AgentStateType,
} from "../state.js";

/*
 * --------------------------------------------------
 * ANALYZER RESULT
 * --------------------------------------------------
 */

export interface AnalyzedQuestion {
  isMultiTopic: boolean;

  questions: string[];
}

/*
 * --------------------------------------------------
 * FORMAT CONVERSATION HISTORY
 * --------------------------------------------------
 */

function formatHistory(
  history:
    | AgentStateType["history"]
    | undefined
): string {

  if (
    !history ||
    history.length === 0
  ) {
    return "No previous conversation.";
  }

  return history
    .slice(-10)
    .map(
      (
        message,
        index
      ) =>
        `[${index + 1}] ${message.role}: ${message.content}`
    )
    .join("\n");
}

/*
 * --------------------------------------------------
 * LLM
 * --------------------------------------------------
 */

const llm =
  createLLM("analyzer");

/*
 * --------------------------------------------------
 * ANALYZE NODE
 * --------------------------------------------------
 */

export async function analyzeNode(
  state: AgentStateType
) {

  console.log(
    "\n=============================="
  );

  console.log(
    "[Question Analyzer]"
  );

  console.log(
    "=============================="
  );

  console.log(
    `[Analyzer] Current question: ${state.question}`
  );

  /*
   * Format previous conversation.
   */

  const history =
    formatHistory(
      state.history
    );

  console.log(
    `[Analyzer] Previous history messages: ${
      state.history?.length ?? 0
    }`
  );

  console.log(
    "[Analyzer] History:"
  );

  console.log(
    history
  );

  /*
   * ------------------------------------------------
   * LLM ANALYSIS
   * ------------------------------------------------
   */

  const response =
    await llm.invoke([
      {
        role: "system",

        content: `
You are the question analyzer for
a university AI assistant.

Your job is to analyze the CURRENT
user question using the conversation
history.

The most important responsibility is
to resolve references to previous
conversation messages.

Examples of references include:

- it
- its
- this
- that
- these
- those
- there
- they
- them
- same
- previous
- above
- course
- subject
- syllabus
- timing
- exam
- assignment

When the current question contains
one of these references, use the
previous conversation to determine
what the user means.

DO NOT treat a follow-up question
as an independent question when its
meaning can be resolved from history.

----------------------------------------
IMPORTANT EXAMPLE 1
----------------------------------------

Previous conversation:

User:
What is CSET 101 for?

Current question:

User:
Give its syllabus.

Correct output:

{
  "isMultiTopic": false,
  "questions": [
    "What is the syllabus for CSET 101?"
  ]
}

----------------------------------------
IMPORTANT EXAMPLE 2
----------------------------------------

Previous conversation:

User:
Where is the library?

Current question:

User:
What's its timing?

Correct output:

{
  "isMultiTopic": false,
  "questions": [
    "What are the timings of the library?"
  ]
}

----------------------------------------
IMPORTANT EXAMPLE 3
----------------------------------------

Previous conversation:

User:
Tell me about CSET 214.

Current question:

User:
What topics does it cover?

Correct output:

{
  "isMultiTopic": false,
  "questions": [
    "What topics does CSET 214 cover?"
  ]
}

----------------------------------------
IMPORTANT EXAMPLE 4
----------------------------------------

Previous conversation:

User:
What is CSET 101?

Current question:

User:
When is its exam?

Correct output:

{
  "isMultiTopic": false,
  "questions": [
    "When is the CSET 101 exam?"
  ]
}

----------------------------------------
MULTI-TOPIC EXAMPLE
----------------------------------------

Current question:

"Tell me the syllabus of CSET 101
and where is the library?"

Correct output:

{
  "isMultiTopic": true,
  "questions": [
    "What is the syllabus of CSET 101?",
    "Where is the library?"
  ]
}

----------------------------------------
RULES
----------------------------------------

1. Determine whether the CURRENT
   request contains one or multiple
   independent information needs.

2. If there is only one information
   need, return exactly one question.

3. If there are multiple independent
   information needs, split them into
   separate questions.

4. ALWAYS resolve references using
   conversation history when possible.

5. Preserve specific entities from
   previous messages.

For example, preserve:

- course codes
- subject names
- buildings
- events
- dates
- facilities
- university services

6. NEVER replace a known entity with
   vague wording.

Bad:

"What is the syllabus?"

Good:

"What is the syllabus for CSET 101?"

7. Do not answer the questions.

8. Do not invent information.

9. Preserve the user's intended meaning.

10. Return ONLY valid JSON.

----------------------------------------
OUTPUT FORMAT
----------------------------------------

For a single question:

{
  "isMultiTopic": false,
  "questions": [
    "standalone resolved question"
  ]
}

For multiple questions:

{
  "isMultiTopic": true,
  "questions": [
    "standalone question 1",
    "standalone question 2"
  ]
}

----------------------------------------
CONVERSATION HISTORY
----------------------------------------

${history}

----------------------------------------
CURRENT QUESTION
----------------------------------------

${state.question}
`,
      },

      {
        role: "user",

        content:
          state.question,
      },
    ]);

  /*
   * ------------------------------------------------
   * CONVERT RESPONSE TO STRING
   * ------------------------------------------------
   */

  const content =
    typeof response.content ===
    "string"
      ? response.content
      : JSON.stringify(
          response.content
        );

  console.log(
    "[Analyzer] Raw LLM response:"
  );

  console.log(
    content
  );

  /*
   * ------------------------------------------------
   * PARSE JSON
   * ------------------------------------------------
   */

  try {

    const parsed =
      JSON.parse(
        content
      ) as AnalyzedQuestion;

    /*
     * Validate isMultiTopic.
     */

    if (
      typeof parsed.isMultiTopic !==
      "boolean"
    ) {
      throw new Error(
        "Invalid isMultiTopic value."
      );
    }

    /*
     * Validate questions.
     */

    if (
      !Array.isArray(
        parsed.questions
      ) ||
      parsed.questions.length === 0
    ) {
      throw new Error(
        "Analyzer returned no questions."
      );
    }

    /*
     * Remove invalid questions.
     */

    const validQuestions =
      parsed.questions
        .filter(
          (question) =>
            typeof question ===
              "string" &&
            question.trim()
              .length > 0
        )
        .map(
          (question) =>
            question.trim()
        );

    if (
      validQuestions.length === 0
    ) {
      throw new Error(
        "Analyzer returned invalid questions."
      );
    }

    /*
     * ------------------------------------------------
     * IMPORTANT SAFETY CHECK
     * ------------------------------------------------
     *
     * If the LLM says this is multi-topic
     * but only returned one question,
     * treat it as single-topic.
     */

    const isMultiTopic =
      parsed.isMultiTopic &&
      validQuestions.length > 1;

    console.log(
      "[Analyzer] Resolved result:"
    );

    console.log({
      isMultiTopic,

      questions:
        validQuestions,
    });

    return {
      questions:
        validQuestions,

      isMultiTopic,
    };

  } catch (error) {

    console.error(
      "[Analyzer] Failed to parse response:",
      error
    );

    /*
     * Safe fallback.
     *
     * Do NOT lose the original question.
     */

    return {
      questions: [
        state.question,
      ],

      isMultiTopic: false,
    };
  }
}