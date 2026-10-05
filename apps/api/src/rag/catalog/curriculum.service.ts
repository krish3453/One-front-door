import fs from "node:fs/promises";
import path from "node:path";
import type { ProgramCurriculum, CourseEntry } from "./build-curriculum-catalog.js";

interface CatalogData {
  generatedAt: string;
  programs: Record<string, ProgramCurriculum>;
  totalPrograms: number;
  totalCourses: number;
}

let cachedCatalog: CatalogData | null = null;

export async function getCurriculumCatalog(): Promise<CatalogData> {
  if (cachedCatalog) {
    return cachedCatalog;
  }

  const catalogPath = path.resolve(
    process.cwd(),
    "../../data/processed/curriculum-catalog.json"
  );

  try {
    const raw = await fs.readFile(catalogPath, "utf-8");
    cachedCatalog = JSON.parse(raw) as CatalogData;
    return cachedCatalog;
  } catch (err) {
    console.warn(`[CurriculumService] Failed to load JSON catalog from ${catalogPath}, loading dynamic fallback`);
    // Dynamic load if file missing
    const { extractCurriculumCatalog } = await import("./build-curriculum-catalog.js");
    const extracted = await extractCurriculumCatalog();
    cachedCatalog = extracted as CatalogData;
    return cachedCatalog;
  }
}

export interface CurriculumQueryResult {
  matched: boolean;
  program?: string;
  degree?: string;
  school?: string;
  batch?: string;
  totalCredits?: number | string;
  semester?: string;
  specialization?: string;
  courses: CourseEntry[];
  summaryText: string;
}

/**
 * Evaluates whether a query is asking for curriculum/catalog structure
 * and returns structured data matching the program, semester, or track.
 */
export async function queryStructuredCurriculum(query: string): Promise<CurriculumQueryResult | null> {
  const normalized = query.toLowerCase();

  const isCurriculumQuery = /\b(all\s+courses|all\s+the\s+courses|list\s+of\s+courses|course\s+list|list\s+courses|curriculum|subjects\s+in|subjects\s+of|courses\s+in|courses\s+of|what\s+are\s+the\s+courses|tell\s+courses|program\s+structure|semester\s+courses|electives?|specialization\s+courses|courses\s+for\s+btech|courses\s+for\s+law|courses\s+for\s+bba\s+llb)\b/i.test(normalized);

  if (!isCurriculumQuery) {
    return null;
  }

  const catalog = await getCurriculumCatalog();

  // Detect program
  const isLaw = /\b(bba\s*llb|ballb|bballb|ba\s*llb|llb|law|school of law|legal)\b/i.test(normalized);
  const isBTech = /\b(btech|b\s*tech|cse|computer science|cset|engineering)\b/i.test(normalized);

  const programKey = isLaw ? "bba-llb" : (isBTech ? "btech-cse" : "btech-cse");
  const program = catalog.programs[programKey];

  if (!program) {
    return null;
  }

  // Check if specific semester was requested
  const semesterMatch = normalized.match(/\b(sem(?:ester)?|term)\s*([1-8]|i{1,3}|iv|v|vi{0,3}|vii{0,2}|viii|ix|x)\b/i);
  let requestedSemester: string | undefined;

  if (semesterMatch) {
    const semNumStr = semesterMatch[2].toLowerCase();
    const semMap: Record<string, string> = {
      "1": "Semester I", "i": "Semester I",
      "2": "Semester II", "ii": "Semester II",
      "3": "Semester III", "iii": "Semester III",
      "4": "Semester IV", "iv": "Semester IV",
      "5": "Semester V", "v": "Semester V",
      "6": "Semester VI", "vi": "Semester VI",
      "7": "Semester VII", "vii": "Semester VII",
      "8": "Semester VIII", "viii": "Semester VIII",
      "9": "Semester IX", "ix": "Semester IX",
      "10": "Semester X", "x": "Semester X",
    };
    requestedSemester = semMap[semNumStr];
  }

  // Check if specific specialization requested
  let requestedSpec: string | undefined;
  if (/\b(ai|artificial intelligence|machine learning|ml)\b/i.test(normalized)) {
    requestedSpec = "Artificial Intelligence (AI)";
  } else if (/\b(cyber\s*security|security|forensics)\b/i.test(normalized)) {
    requestedSpec = "Cyber Security";
  } else if (/\b(devops|cloud|cloud computing)\b/i.test(normalized)) {
    requestedSpec = "Cloud Computing & DevOps";
  } else if (/\b(data science|big data|analytics)\b/i.test(normalized)) {
    requestedSpec = "Data Science";
  } else if (/\b(blockchain|crypto|smart contracts)\b/i.test(normalized)) {
    requestedSpec = "Blockchain Technology";
  } else if (/\b(gaming|ar|vr|virtual reality|game dev)\b/i.test(normalized)) {
    requestedSpec = "Gaming & Virtual Reality / Full Stack";
  }

  // Format structured markdown summary
  let summaryText = `### ${program.programName} (${program.degree})\n`;
  summaryText += `**School:** ${program.school} | **Duration:** ${program.duration} | **Batch:** ${program.batch}\n\n`;

  let resultCourses: CourseEntry[] = [];

  if (requestedSemester) {
    const semData = program.semesters.find(s => s.semester.toLowerCase() === requestedSemester!.toLowerCase());
    if (semData) {
      resultCourses = semData.courses;
      summaryText += `#### ${semData.semester} Courses:\n\n`;
      summaryText += `| Course Code | Course Name | Credits | L-T-P | Category |\n`;
      summaryText += `| :--- | :--- | :--- | :--- | :--- |\n`;
      for (const c of semData.courses) {
        summaryText += `| **${c.code}** | ${c.name} | ${c.credits} | ${c.ltp || "N/A"} | ${c.category || "Core"} |\n`;
      }
    }
  } else if (requestedSpec && program.specializations) {
    const specData = program.specializations.find(s => s.name.toLowerCase().includes(requestedSpec!.toLowerCase()));
    if (specData) {
      resultCourses = specData.courses;
      summaryText += `#### Specialization Track: ${specData.name}\n\n`;
      summaryText += `| Course Code | Course Name | Credits | L-T-P |\n`;
      summaryText += `| :--- | :--- | :--- | :--- |\n`;
      for (const c of specData.courses) {
        summaryText += `| **${c.code}** | ${c.name} | ${c.credits} | ${c.ltp || "N/A"} |\n`;
      }
    }
  } else {
    // Return all semesters and complete structured breakdown
    resultCourses = program.allCourses;
    summaryText += `Total program requirements: **${program.totalCredits ?? 160} Total Credits** across ${program.semesters.length} semesters.\n\n`;

    for (const sem of program.semesters) {
      summaryText += `#### ${sem.semester}\n\n`;
      summaryText += `| Course Code | Course Name | Credits | L-T-P / Type |\n`;
      summaryText += `| :--- | :--- | :--- | :--- |\n`;
      for (const c of sem.courses) {
        summaryText += `| **${c.code}** | ${c.name} | ${c.credits} | ${c.ltp || c.category || "Core"} |\n`;
      }
      summaryText += `\n`;
    }

    if (program.specializations && program.specializations.length > 0) {
      summaryText += `#### Specialization Elective Tracks:\n\n`;
      for (const spec of program.specializations) {
        summaryText += `**${spec.name}:**\n`;
        for (const c of spec.courses) {
          summaryText += `- **${c.code}**: ${c.name} (${c.credits} Credits)\n`;
        }
        summaryText += `\n`;
      }
    }

    if (program.electives && program.electives.length > 0) {
      summaryText += `#### Available Electives:\n\n`;
      summaryText += `| Course Code | Elective Course Title | Credits |\n`;
      summaryText += `| :--- | :--- | :--- |\n`;
      for (const c of program.electives) {
        summaryText += `| **${c.code}** | ${c.name} | ${c.credits} |\n`;
      }
      summaryText += `\n`;
    }
  }

  return {
    matched: true,
    program: program.programName,
    degree: program.degree,
    school: program.school,
    batch: program.batch,
    totalCredits: program.totalCredits,
    semester: requestedSemester,
    specialization: requestedSpec,
    courses: resultCourses,
    summaryText
  };
}
