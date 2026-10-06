import type { ActionPayload } from "@one-front-door/shared-types";
import { calculateAttendance } from "./attendance-calculator.js";
import { generateAcademicPetition } from "./petition-generator.js";

export interface ActionResult {
  actionExecuted: boolean;
  toolName?: string;
  actionPayload?: ActionPayload;
  formattedOutput?: string;
}

/**
 * Detects if a student's prompt is requesting an interactive Action Tool
 * (e.g. attendance bunk calculation, formal academic petition drafting).
 */
export function tryExecuteActionTool(query: string): ActionResult {
  const normalized = query.toLowerCase();

  /*
   * ----------------------------------------------------
   * 1. ATTENDANCE & BUNK PLANNER ACTION TOOL
   * ----------------------------------------------------
   */
  const attendanceKeywords = ["bunk", "attendance", "skip", "miss class", "classes attended", "conducted", "shortage", "debarred"];
  const hasAttendanceKeyword = attendanceKeywords.some((k) => normalized.includes(k));

  if (hasAttendanceKeyword) {
    // Pattern 1: "18 out of 24", "18 / 24", "18/24", "attended 18 conducted 24"
    const ratioMatch =
      query.match(/(\d+)\s*(?:\/|out of|attended\s*,\s*)\s*(\d+)/i) ||
      query.match(/attended\s*(\d+)\s*(?:and|of|,)?\s*(?:total|conducted)?\s*(\d+)/i) ||
      query.match(/(\d+)\s*classes\s*attended\s*(?:out of|total)?\s*(\d+)/i);

    // Pattern 2: "78% attendance", "78 percent"
    const percentMatch = query.match(/(\d{1,2}(?:\.\d+)?)\s*%/i) || query.match(/(\d{1,2}(?:\.\d+)?)\s*percent/i);

    if (ratioMatch) {
      const num1 = parseInt(ratioMatch[1], 10);
      const num2 = parseInt(ratioMatch[2], 10);
      const attended = Math.min(num1, num2);
      const conducted = Math.max(num1, num2);

      // Subject extraction heuristic
      const subjectMatch = query.match(/(?:in|for|of)\s+([A-Za-z0-9\s]{2,20})(?:\?|\.|\s+classes|\s+attendance|$)/i);
      const subjectName = subjectMatch ? subjectMatch[1].trim() : undefined;

      const calc = calculateAttendance({
        attended,
        conducted,
        targetPercentage: 75,
        subjectName,
      });

      const formatted = `### 📊 University Attendance & Bunk Planner Result

| Metric | Details |
| :--- | :--- |
| **Course / Subject** | ${calc.subjectName ?? "General Coursework"} |
| **Classes Attended** | **${calc.attended}** / ${calc.conducted} |
| **Current Attendance** | **${calc.currentPercentage}%** |
| **University Threshold** | ${calc.targetPercentage}% (Bennett University Mandatory Min) |
| **Status** | ${
        calc.status === "safe"
          ? "🟢 **SAFE TO BUNK**"
          : calc.status === "warning"
          ? "🟡 **BORDERLINE / CAUTION**"
          : calc.status === "danger"
          ? "🔴 **DANGER (BELOW 75%)**"
          : "🚨 **CRITICAL RISK OF DEBARMENT**"
      } |
| **Safe Skips Remaining** | **${calc.bunksAvailable}** class${calc.bunksAvailable === 1 ? "" : "es"} |
| **Classes Needed to Recover** | **${calc.classesNeededToRecover}** continuous class${calc.classesNeededToRecover === 1 ? "" : "es"} |

> **Summary:** ${calc.summary}

*Rule Reference: Bennett University Attendance Policy requires minimum 75% aggregate attendance to be eligible for End-Semester Examinations.*`;

      return {
        actionExecuted: true,
        toolName: "attendance_bunk_calculator",
        actionPayload: {
          type: "attendance_calculator",
          attendance: calc,
          title: "Attendance & Bunk Calculator",
        },
        formattedOutput: formatted,
      };
    }
  }

  /*
   * ----------------------------------------------------
   * 2. ACADEMIC PETITION / FORMAL DRAFTER ACTION TOOL
   * ----------------------------------------------------
   */
  const petitionKeywords = [
    "draft a petition",
    "draft petition",
    "write an application",
    "write application",
    "draft an application",
    "letter to dean",
    "letter to hod",
    "makeup exam application",
    "makeup exam petition",
    "medical leave application",
    "attendance condonation application",
    "attendance condonation petition",
    "course drop request",
    "course drop letter",
    "hostel out pass application",
    "hostel leave letter",
  ];

  const matchedPetition = petitionKeywords.some((k) => normalized.includes(k));

  if (matchedPetition) {
    let petitionType: "medical_leave" | "makeup_exam" | "attendance_condonation" | "course_drop" | "hostel_leave" | "general" = "general";

    if (normalized.includes("makeup") || normalized.includes("supplementary") || normalized.includes("re-exam")) {
      petitionType = "makeup_exam";
    } else if (normalized.includes("condonation") || (normalized.includes("attendance") && normalized.includes("medical"))) {
      petitionType = "attendance_condonation";
    } else if (normalized.includes("medical") || normalized.includes("sick") || normalized.includes("fever") || normalized.includes("hospital")) {
      petitionType = "medical_leave";
    } else if (normalized.includes("drop") || normalized.includes("withdraw")) {
      petitionType = "course_drop";
    } else if (normalized.includes("hostel") || normalized.includes("outpass") || normalized.includes("curfew")) {
      petitionType = "hostel_leave";
    }

    const petition = generateAcademicPetition({
      petitionType,
      reason: query,
    });

    const formatted = `### 📝 Formal Academic Petition Generated

**Recipient:**  
\`\`\`
${petition.recipient}
\`\`\`

**Subject:** \`${petition.subject}\`

---

#### 📄 Letter Body:
\`\`\`text
${petition.body}
\`\`\`

---

#### 📌 University Regulations Cited:
${petition.relevantRulesCited.map((r) => `- ${r}`).join("\n")}

#### 📎 Mandatory Supporting Enclosures:
${petition.enclosures.map((e) => `- [ ] ${e}`).join("\n")}

*(You can copy this letter directly or use the quick action button below to send it to the administration.)*`;

    return {
      actionExecuted: true,
      toolName: "academic_petition_generator",
      actionPayload: {
        type: "academic_petition",
        petition,
        title: "Official Academic Petition Drafter",
      },
      formattedOutput: formatted,
    };
  }

  return { actionExecuted: false };
}
