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
export async function tryExecuteActionTool(query: string): Promise<ActionResult> {
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
  const isPetitionQuery =
    /petition/i.test(normalized) ||
    /(?:draft|write|generate|create)\s+(?:a\s+)?(?:formal\s+)?(?:hostel\s+)?(?:petition|application|letter|request|form|outpass|mail|email)/i.test(normalized) ||
    /(?:letter|application|petition|request|outpass)\s+to\s+(?:the\s+)?(?:dean|hod|warden|chief warden|controller|registrar|vice chancellor)/i.test(normalized) ||
    /(?:makeup|make-up|supplementary|re-exam|re-test)\s+(?:mid-term|midterm|end-term|endterm|exam|examination|quiz|test)/i.test(normalized) ||
    /(?:attendance|medical)\s+(?:condonation|exemption|leave application|leave letter)/i.test(normalized);

  if (isPetitionQuery) {
    let petitionType: "medical_leave" | "makeup_exam" | "attendance_condonation" | "course_drop" | "hostel_leave" | "room_change" | "general" = "general";

    if (
      normalized.includes("makeup") ||
      normalized.includes("make-up") ||
      normalized.includes("supplementary") ||
      normalized.includes("re-exam") ||
      normalized.includes("re-test") ||
      normalized.includes("missed exam") ||
      normalized.includes("missed mid-term")
    ) {
      petitionType = "makeup_exam";
    } else if (
      normalized.includes("condonation") ||
      (normalized.includes("attendance") && (normalized.includes("medical") || normalized.includes("shortage") || normalized.includes("fever") || normalized.includes("sick")))
    ) {
      petitionType = "attendance_condonation";
    } else if (
      normalized.includes("medical") ||
      normalized.includes("sick") ||
      normalized.includes("fever") ||
      normalized.includes("hospital") ||
      normalized.includes("injury") ||
      normalized.includes("accident") ||
      normalized.includes("surgery")
    ) {
      petitionType = "medical_leave";
    } else if (normalized.includes("drop") || normalized.includes("withdraw")) {
      petitionType = "course_drop";
    } else if (normalized.includes("hostel") || normalized.includes("outpass") || normalized.includes("night pass") || normalized.includes("curfew")) {
      petitionType = "hostel_leave";
    } else if (normalized.includes("room change") || normalized.includes("change room") || normalized.includes("room reallocation")) {
      petitionType = "room_change";
    }

    // Extract subject/course: e.g. "in Data Structures", "for Operating Systems", "in CSE201"
    let courseOrSubject: string | undefined = undefined;
    const courseMatch =
      query.match(/(?:in|for|course)\s+([A-Za-z0-9\s&]{2,30}?)(?:\s+due to|\s+because|\s+owing to|\s+suffering from|\.|\?|$)/i) ||
      query.match(/(?:in|for)\s+([A-Z][A-Za-z0-9\s&]{2,25})/);
    if (courseMatch && courseMatch[1]) {
      const candidate = courseMatch[1].trim();
      if (!/^(the|a|an|formal|makeup|dean|hod|medical|hostel|exam|re-exam)$/i.test(candidate)) {
        courseOrSubject = candidate;
      }
    }

    // Extract reason: e.g. "due to severe viral fever", "because of viral infection"
    let extractedReason = query;
    const reasonMatch = query.match(/(?:due to|because of|owing to|on account of|suffering from|reason:?)\s+([A-Za-z0-9\s,.-]{3,80})/i);
    if (reasonMatch && reasonMatch[1]) {
      extractedReason = reasonMatch[1].trim().replace(/[.?]+$/, "");
    }

    const petition = await generateAcademicPetition({
      petitionType,
      courseOrSubject,
      reason: extractedReason,
    }, query);

    const isCampusPetition = petitionType === "hostel_leave" || petitionType === "room_change";
    const petitionCategoryStr = isCampusPetition ? "Campus / Hostel Petition" : "Academic Petition";

    const formatted = `### 📝 Formal ${petitionCategoryStr} Generated

**Recipient:**  
\`\`\`
${petition.recipient}
\`\`\`

**Subject:** \`${petition.subject}\`

---

#### 📄 Official Letter Body:
\`\`\`text
${petition.body}
\`\`\`

---

#### 📌 University Regulations Cited:
${petition.relevantRulesCited.map((r) => `- ${r}`).join("\n")}

#### 📎 Mandatory Supporting Enclosures:
${petition.enclosures.map((e) => `- [ ] ${e}`).join("\n")}

*(You can copy this letter directly or use the quick action button below to email the administration.)*`;

    return {
      actionExecuted: true,
      toolName: isCampusPetition ? "campus_petition_generator" : "academic_petition_generator",
      actionPayload: {
        type: isCampusPetition ? "campus_petition" : "academic_petition",
        petition,
        title: `Official ${petitionCategoryStr} Prepared`,
      },
      formattedOutput: formatted,
    };
  }

  return { actionExecuted: false };
}
