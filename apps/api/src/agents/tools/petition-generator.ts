import type { AcademicPetitionResult } from "@one-front-door/shared-types";
import { z } from "zod";
import { createLLM } from "../../llm/factory.js";

export interface PetitionInput {
  petitionType: "medical_leave" | "makeup_exam" | "attendance_condonation" | "course_drop" | "hostel_leave" | "room_change" | "general";
  studentName?: string;
  enrollmentNo?: string;
  department?: string;
  courseOrSubject?: string;
  reason: string;
  datesOrDetails?: string;
}

export async function generateAcademicPetition(input: PetitionInput, query: string): Promise<AcademicPetitionResult> {
  const llm = createLLM("petition-drafter");
  
  const PetitionSchema = z.object({
    recipient: z.string().describe("The recipient of the petition, formatted cleanly. E.g., The Chief Warden, The Dean of Academic Affairs, etc."),
    subject: z.string().describe("The formal subject line for the email/petition."),
    body: z.string().describe("The main body of the letter/email, writing in a highly formal, academic, and respectful tone."),
    relevantRulesCited: z.array(z.string()).describe("A list of 1-2 university policies or rules relevant to this request."),
    enclosures: z.array(z.string()).describe("A list of documents the student needs to attach (e.g. Medical Certificate, Consent Letter)."),
  });

  const structuredLLM = llm.withStructuredOutput(PetitionSchema);

  const prompt = `You are the 'One Front Door' university assistant. Your job is to draft formal, professional university petitions, emails, or applications on behalf of a student.

Draft a formal letter based on the following context:
Original User Intent: "${query}"
Classified Category: ${input.petitionType}
Extracted Reason: ${input.reason}
Extracted Course/Subject: ${input.courseOrSubject || "N/A"}

Please generate a highly professional, persuasive, and university-standard petition/email.
- Address it to the exact appropriate university authority based on the context (e.g., Dean, HOD, Chief Warden, Controller of Examinations).
- Use a formal, respectful, and polite tone. Keep the body concise but sufficiently detailed for a university administrator to approve.
- Include placeholders like [Your Full Name], [Enrollment No.], and [Date] at the bottom of the letter where appropriate.
- Do NOT invent specific rule numbers unless you are absolutely sure of a common standard (e.g. 75% attendance rule). Instead, cite the general policy name for the 'relevantRulesCited' array.
- For the 'enclosures' array, list the typical mandatory documents (e.g. Medical Certificate for medical leave, Parent Consent for hostel outpass).

Return the structured data matching the schema.`;

  const result = await structuredLLM.invoke([{ role: "user", content: prompt }]);

  return {
    petitionType: input.petitionType,
    recipient: result.recipient,
    subject: result.subject,
    body: result.body,
    relevantRulesCited: result.relevantRulesCited,
    enclosures: result.enclosures,
  };
}
