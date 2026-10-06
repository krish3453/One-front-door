import type { AcademicPetitionResult } from "@one-front-door/shared-types";

export interface PetitionInput {
  petitionType: "medical_leave" | "makeup_exam" | "attendance_condonation" | "course_drop" | "hostel_leave" | "general";
  studentName?: string;
  enrollmentNo?: string;
  department?: string;
  courseOrSubject?: string;
  reason: string;
  datesOrDetails?: string;
}

export function generateAcademicPetition(input: PetitionInput): AcademicPetitionResult {
  const dateStr = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const studentName = input.studentName || "[Your Full Name]";
  const enrollmentNo = input.enrollmentNo || "[Enrollment / Student ID No.]";
  const department = input.department || "School of Computer Science Engineering & Technology";
  const course = input.courseOrSubject || "[Course / Subject Name & Code]";
  const reason = input.reason.trim();
  const dates = input.datesOrDetails || "[Dates / Duration of Absence]";

  let recipient = "The Dean / Head of Department";
  let subject = "";
  let body = "";
  let relevantRulesCited: string[] = [];
  let enclosures: string[] = [];

  switch (input.petitionType) {
    case "makeup_exam": {
      recipient = "The Controller of Examinations & Head of Department,\nBennett University, Greater Noida";
      subject = `Application for Makeup / Supplementary Examination — ${course}`;
      relevantRulesCited = [
        "Examination Manual 2024-25, Clause 6.4 (Provision for Makeup Examination on Genuine Medical/Emergency Grounds)",
        "Attendance and Evaluation Regulations (Minimum verified attendance prerequisite)",
      ];
      enclosures = [
        "Medical Fitness Certificate from registered medical practitioner / hospital discharge summary",
        "Prescription & diagnostic test reports",
        "Original Admit Card copy",
      ];
      body = `Respected Sir/Madam,

I am writing to formally request permission to appear in the Makeup Examination for the course "${course}" (Course Code: [CODE]). 

I was unfortunately unable to appear in the scheduled examination held on ${dates} due to the following unforeseen and genuine circumstances:
${reason}

In accordance with Bennett University Examination Regulations Clause 6.4, I have attached all mandatory supporting medical / evidentiary documentation verified by authorized authorities. I have maintained active engagement in the coursework and meet all requisite eligibility criteria.

I kindly request your approval to permit me to appear for the makeup assessment at the earliest designated schedule.

Thanking you.

Yours sincerely,
${studentName}
Enrollment No: ${enrollmentNo}
Batch & Program: ${department}
Date: ${dateStr}`;
      break;
    }

    case "attendance_condonation":
    case "medical_leave": {
      recipient = "The Dean (Academic Affairs) / Head of Department,\nBennett University, Greater Noida";
      subject = `Formal Petition for Attendance Condonation on Medical Grounds — ${course}`;
      relevantRulesCited = [
        "Student Attendance Policy Notification 2024-25 (Special Condonation up to 10% on Certified Medical Grounds)",
        "Student Discipline & Academic Conduct Guidelines",
      ];
      enclosures = [
        "Original Medical Certificate from Registered Medical Practitioner",
        "BU Health Center Verification / Endorsement Slip",
        "Leave Application submitted prior to / during the illness",
      ];
      body = `Respected Sir/Madam,

I respectfully submit this application to request attendance condonation for the subject "${course}" under the approved university provisions for medical exigencies.

I was indisposed and medically advised bed rest from ${dates} due to:
${reason}

Due to this unavoidable absence, my attendance has suffered a temporary deficit. In compliance with the University Attendance Policy, I have submitted the authenticated medical certificates and hospital records to the University Health Center for due verification.

I request your benevolent consideration to condone the absence for the aforementioned period so that I may remain eligible to sit for the end-term assessments.

Thanking you.

Yours faithfully,
${studentName}
Enrollment No: ${enrollmentNo}
Department: ${department}
Date: ${dateStr}`;
      break;
    }

    case "course_drop": {
      recipient = "The Dean (Academic Affairs) & Academic Registrar,\nBennett University, Greater Noida";
      subject = `Request for Formal Course Drop / Academic Load Adjustment — ${course}`;
      relevantRulesCited = [
        "Academic Ordinance (Course Registration and Drop Period Deadline Policy)",
        "Minimum Academic Credit Load Requirement (16 Credits per semester)",
      ];
      enclosures = [
        "Faculty Advisor / Mentor Recommendation Note",
        "Current Semester Course Registration Summary",
      ];
      body = `Respected Sir/Madam,

I am writing to formally request withdrawal / drop from the elective course "${course}".

Reason for withdrawal:
${reason}

I have consulted with my Faculty Academic Advisor and verified that dropping this course does not breach the minimum credit threshold (16 credits) required for the current semester.

I kindly request you to process this course drop and update my ERP portal records accordingly.

Thanking you.

Yours sincerely,
${studentName}
Enrollment No: ${enrollmentNo}
Department: ${department}
Date: ${dateStr}`;
      break;
    }

    case "hostel_leave": {
      recipient = "The Chief Warden / Hostel Administrator,\nBennett University Hostel Office";
      subject = `Application for Extended Out-Pass / Special Leave Permission`;
      relevantRulesCited = [
        "Hostel Rules & Code of Conduct (Night Curfew and Gate Pass Protocol)",
        "Parental Consent Policy for Overnight Absence",
      ];
      enclosures = [
        "Parent / Guardian Verified Consent Letter / Email",
        "Event Invitation / Medical Appointment Slip (if applicable)",
      ];
      body = `Respected Warden,

I request permission for official leave from the hostel premises for the duration of ${dates}.

Purpose of leave:
${reason}

My parents/guardians are fully aware of this travel and have provided their verified consent. I undertake full responsibility to adhere to all university safety guidelines and report back to the campus before the designated curfew on my return date.

Thanking you.

Yours obediently,
${studentName}
Room No: [Hostel Block & Room No.]
Enrollment No: ${enrollmentNo}
Contact: [Your Mobile Number]
Date: ${dateStr}`;
      break;
    }

    default: {
      recipient = "The Head of Department / Academic Dean,\nBennett University";
      subject = `Academic Petition / Representation regarding ${course}`;
      relevantRulesCited = [
        "University Academic Handbook & Student Regulations",
      ];
      enclosures = ["Supporting documents and correspondence"];
      body = `Respected Sir/Madam,

I am writing to submit this formal academic petition regarding:
${reason}

Details:
Course / Subject: ${course}
Period: ${dates}

I request your favorable consideration and guidance on this matter.

Thanking you.

Yours sincerely,
${studentName}
Enrollment No: ${enrollmentNo}
Department: ${department}
Date: ${dateStr}`;
    }
  }

  return {
    petitionType: input.petitionType,
    recipient,
    subject,
    body,
    relevantRulesCited,
    enclosures,
  };
}
