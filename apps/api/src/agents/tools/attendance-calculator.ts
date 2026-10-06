import type { AttendanceCalculationResult } from "@one-front-door/shared-types";

export interface AttendanceInput {
  attended: number;
  conducted: number;
  targetPercentage?: number;
  subjectName?: string;
}

export function calculateAttendance(input: AttendanceInput): AttendanceCalculationResult {
  const conducted = Math.max(1, Math.round(input.conducted));
  const attended = Math.max(0, Math.min(conducted, Math.round(input.attended)));
  const target = input.targetPercentage ?? 75; // 75% standard university threshold

  const currentPercentage = Number(((attended / conducted) * 100).toFixed(1));

  let status: AttendanceCalculationResult["status"] = "safe";
  let bunksAvailable = 0;
  let classesNeededToRecover = 0;

  if (currentPercentage >= target) {
    // How many more classes can be missed while staying >= target%
    // (attended) / (conducted + bunks) >= target / 100
    // attended >= (conducted + bunks) * (target / 100)
    // bunks <= (attended / (target / 100)) - conducted
    const maxConducted = Math.floor(attended / (target / 100));
    bunksAvailable = Math.max(0, maxConducted - conducted);

    if (currentPercentage === target || bunksAvailable === 0) {
      status = "warning";
    } else {
      status = "safe";
    }
  } else {
    // How many consecutive classes must be attended to reach target%
    // (attended + x) / (conducted + x) >= target / 100
    // attended + x >= (conducted + x) * (target / 100)
    // x * (1 - target/100) >= conducted * (target/100) - attended
    // x >= (conducted * target/100 - attended) / (1 - target/100)
    const needed = Math.ceil(
      (conducted * (target / 100) - attended) / (1 - target / 100)
    );
    classesNeededToRecover = Math.max(1, needed);

    if (currentPercentage < 65) {
      status = "debarred";
    } else {
      status = "danger";
    }
  }

  let summary = "";
  if (status === "safe") {
    summary = `You currently have ${currentPercentage}% attendance (${attended}/${conducted} classes). You can safely skip **${bunksAvailable}** more class${bunksAvailable === 1 ? "" : "es"} without falling below the ${target}% threshold.`;
  } else if (status === "warning") {
    summary = `You are on the borderline with ${currentPercentage}% attendance (${attended}/${conducted} classes). You have **0** buffer classes left. Any missed class will immediately drop you below ${target}%.`;
  } else if (status === "danger") {
    summary = `Alert: Your attendance is ${currentPercentage}% (${attended}/${conducted} classes), which is below the mandatory ${target}% minimum. You must attend the next **${classesNeededToRecover}** consecutive class${classesNeededToRecover === 1 ? "" : "es"} without absence to get back in good standing.`;
  } else {
    summary = `Critical: Your attendance is severely low at ${currentPercentage}% (${attended}/${conducted} classes). You risk direct debarment from semester exams. You need **${classesNeededToRecover}** continuous classes to reach ${target}%. Immediate formal petition / medical justification is strongly advised.`;
  }

  return {
    conducted,
    attended,
    currentPercentage,
    targetPercentage: target,
    status,
    bunksAvailable,
    classesNeededToRecover,
    subjectName: input.subjectName,
    summary,
  };
}
