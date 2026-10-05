import fs from "node:fs/promises";
import path from "node:path";

export interface CourseEntry {
  code: string;
  name: string;
  credits: number | string;
  semester?: string;
  category?: string;
  specialization?: string;
  ltp?: string;
  program: string;
}

export interface ProgramCurriculum {
  programName: string;
  degree: string;
  school: string;
  duration: string;
  batch: string;
  totalCredits?: number | string;
  semesters: {
    semester: string;
    courses: CourseEntry[];
  }[];
  specializations?: {
    name: string;
    courses: CourseEntry[];
  }[];
  electives?: CourseEntry[];
  allCourses: CourseEntry[];
}

export async function extractCurriculumCatalog() {
  const rootDir = process.cwd();

  // 1. Structured BTech CSE Catalog
  const btechCurriculum: ProgramCurriculum = {
    programName: "Bachelor of Technology in Computer Science Engineering",
    degree: "B.Tech CSE",
    school: "School of Computer Science Engineering and Technology",
    duration: "4 Years (8 Semesters)",
    batch: "2025-2029",
    totalCredits: 160,
    semesters: [
      {
        semester: "Semester I",
        courses: [
          { code: "CSET101", name: "Computational Thinking and Programming", credits: 5, ltp: "2-1-4", program: "B.Tech CSE", category: "Core" },
          { code: "EMAT101L", name: "Engineering Calculus", credits: 4, ltp: "3-1-0", program: "B.Tech CSE", category: "Core Mathematics" },
          { code: "EPHY111L", name: "Electromagnetics and Mechanics", credits: 5, ltp: "3-1-2", program: "B.Tech CSE", category: "Core Physics" },
          { code: "CSET108", name: "Environment and Sustainability", credits: 3, ltp: "3-0-0", program: "B.Tech CSE", category: "Core" },
          { code: "CSET110", name: "Foundations of Innovation and Entrepreneurship", credits: 0, ltp: "1-0-0", program: "B.Tech CSE", category: "Audit" },
        ]
      },
      {
        semester: "Semester II",
        courses: [
          { code: "CSET102", name: "Discrete Mathematical Structures", credits: 4, ltp: "3-1-0", program: "B.Tech CSE", category: "Core" },
          { code: "CSET103", name: "Data Structures Using C", credits: 5, ltp: "3-0-4", program: "B.Tech CSE", category: "Core" },
          { code: "CSET105", name: "Digital Design", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", category: "Core" },
          { code: "CSET106", name: "Object Oriented Programming using Java", credits: 4, ltp: "2-0-4", program: "B.Tech CSE", category: "Core" },
          { code: "CSET107", name: "Effective Technical Communication", credits: 2, ltp: "1-0-2", program: "B.Tech CSE", category: "Core Humanities" },
          { code: "CSET109", name: "Basic Electrical and Electronics Engineering", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", category: "Core Engineering" }
        ]
      },
      {
        semester: "Semester III",
        courses: [
          { code: "CSET201", name: "Database Management Systems", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", category: "Core" },
          { code: "CSET205", name: "Probability and Statistics", credits: 4, ltp: "3-1-0", program: "B.Tech CSE", category: "Core Mathematics" },
          { code: "CSET208", name: "Web Technologies", credits: 4, ltp: "2-0-4", program: "B.Tech CSE", category: "Core" },
          { code: "CSET245", name: "Advanced Data Structures & Algorithms", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", category: "Core" },
          { code: "Specialization-Core-I", name: "Specialization Core - I (Track Dependent)", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", category: "Specialization Core" }
        ]
      },
      {
        semester: "Semester IV",
        courses: [
          { code: "CSET203", name: "Microprocessors and Computer Architecture", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", category: "Core" },
          { code: "CSET244", name: "Design and Analysis of Algorithms", credits: 7, ltp: "3-1-6", program: "B.Tech CSE", category: "Core" },
          { code: "CSET207", name: "Computer Networks", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", category: "Core" },
          { code: "CSET209", name: "Operating Systems", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", category: "Core" },
          { code: "CSET210", name: "Design Thinking & Innovation", credits: 2, ltp: "0-0-4", program: "B.Tech CSE", category: "Core" },
          { code: "Specialization-Core-II", name: "Specialization Core - II (Track Dependent)", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", category: "Specialization Core" }
        ]
      },
      {
        semester: "Semester V",
        courses: [
          { code: "CSET301", name: "Software Engineering & Agile Methodologies", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", category: "Core" },
          { code: "CSET303", name: "Theory of Computation & Compiler Design", credits: 4, ltp: "3-1-0", program: "B.Tech CSE", category: "Core" },
          { code: "CSET305", name: "Information & Network Security", credits: 3, ltp: "3-0-0", program: "B.Tech CSE", category: "Core" },
          { code: "CSET307", name: "Specialization Elective - I", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", category: "Specialization Elective" },
          { code: "CSET309", name: "Specialization Elective - II", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", category: "Specialization Elective" },
          { code: "CSET311", name: "Open Elective - I", credits: 3, ltp: "3-0-0", program: "B.Tech CSE", category: "Open Elective" },
          { code: "CSET398", name: "Project Based Learning / Industrial Training", credits: 2, ltp: "0-0-4", program: "B.Tech CSE", category: "Project" }
        ]
      },
      {
        semester: "Semester VI",
        courses: [
          { code: "CSET306", name: "Undergraduate Research in Computer Science Engineering", credits: 1, ltp: "0-1-0", program: "B.Tech CSE", category: "Research" },
          { code: "HSS-Elective", name: "Humanities & Social Sciences (HSS) Elective", credits: 3, ltp: "3-0-0", program: "B.Tech CSE", category: "Humanities" },
          { code: "Specialization-Elective-III", name: "Specialization Elective – III", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", category: "Specialization Elective" },
          { code: "Elective-IV", name: "Department Elective - IV", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", category: "Department Elective" },
          { code: "Open-Elective-II", name: "Open Elective - II", credits: 3, ltp: "3-0-0", program: "B.Tech CSE", category: "Open Elective" },
          { code: "Elective-V", name: "Department Elective - V", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", category: "Department Elective" },
          { code: "Open-Elective-III", name: "Open Elective - III", credits: 3, ltp: "3-0-0", program: "B.Tech CSE", category: "Open Elective" },
          { code: "CSET399", name: "Summer Internship / Industry Project", credits: 2, ltp: "0-0-4", program: "B.Tech CSE", category: "Internship" }
        ]
      },
      {
        semester: "Semester VII",
        courses: [
          { code: "CSET402", name: "Capstone Project - Phase I", credits: 6, ltp: "0-0-12", program: "B.Tech CSE", category: "Capstone Project" },
          { code: "Specialization-Elective-VI", name: "Specialization Elective – VI", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", category: "Specialization Elective" },
          { code: "Open-Elective-IV", name: "Open Elective - IV", credits: 3, ltp: "3-0-0", program: "B.Tech CSE", category: "Open Elective" },
          { code: "Elective-VII", name: "Department Elective - VII", credits: 3, ltp: "3-0-0", program: "B.Tech CSE", category: "Department Elective" }
        ]
      },
      {
        semester: "Semester VIII",
        courses: [
          { code: "CSET499", name: "Industry Internship / Capstone Project - Phase II", credits: 12, ltp: "0-0-24", program: "B.Tech CSE", category: "Capstone/Internship" },
          { code: "CSET404", name: "Emerging Technologies Seminar", credits: 2, ltp: "1-0-2", program: "B.Tech CSE", category: "Seminar" }
        ]
      }
    ],
    specializations: [
      {
        name: "Artificial Intelligence (AI)",
        courses: [
          { code: "CSET211", name: "Statistical Machine Learning", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", specialization: "AI" },
          { code: "CSET312", name: "Deep Learning & Neural Networks", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", specialization: "AI" },
          { code: "CSET417", name: "Emerging Topics in Artificial Intelligence", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", specialization: "AI" },
          { code: "CSET321", name: "Natural Language Processing", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", specialization: "AI" },
          { code: "CSET322", name: "Computer Vision", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", specialization: "AI" },
          { code: "CSET323", name: "Reinforcement Learning", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", specialization: "AI" },
          { code: "CSET324", name: "Generative AI and Large Language Models", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", specialization: "AI" },
        ]
      },
      {
        name: "Cyber Security",
        courses: [
          { code: "CSET213", name: "Linux and Shell Programming", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", specialization: "Cyber Security" },
          { code: "CSET314", name: "Ethical Hacking & Penetration Testing", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", specialization: "Cyber Security" },
          { code: "CSET415", name: "Emerging Topics in Cyber Security", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", specialization: "Cyber Security" },
          { code: "CSET327", name: "Digital Forensics & Incident Response", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", specialization: "Cyber Security" },
          { code: "CSET328", name: "Cryptography & Network Defense", credits: 3, ltp: "3-0-0", program: "B.Tech CSE", specialization: "Cyber Security" },
        ]
      },
      {
        name: "Cloud Computing & DevOps",
        courses: [
          { code: "CSET217", name: "Software Development with DevOps", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", specialization: "DevOps" },
          { code: "CSET316", name: "Cloud Infrastructure and Services (AWS/Azure)", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", specialization: "Cloud" },
          { code: "CSET409", name: "Emerging Topics in Cloud Computing", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", specialization: "Cloud" },
          { code: "CSET454", name: "Test Automation in DevOps", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", specialization: "DevOps" },
          { code: "CSET331", name: "Microservices Architecture & Kubernetes", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", specialization: "DevOps" },
        ]
      },
      {
        name: "Data Science",
        courses: [
          { code: "CSET214", name: "Data Analysis using Python", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", specialization: "Data Science" },
          { code: "CSET318", name: "Big Data Analytics & Spark", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", specialization: "Data Science" },
          { code: "CSET333", name: "Data Visualization and BI Tools", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", specialization: "Data Science" },
          { code: "CSET334", name: "Predictive Modeling and Time Series Analysis", credits: 3, ltp: "3-0-0", program: "B.Tech CSE", specialization: "Data Science" },
        ]
      },
      {
        name: "Blockchain Technology",
        courses: [
          { code: "CSET212", name: "Blockchain Foundations", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", specialization: "Blockchain" },
          { code: "CSET313", name: "Smart Contracts & Ethereum Development", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", specialization: "Blockchain" },
          { code: "CSET325", name: "Decentralized Applications (DApps)", credits: 3, ltp: "2-0-2", program: "B.Tech CSE", specialization: "Blockchain" },
        ]
      },
      {
        name: "Gaming & Virtual Reality / Full Stack",
        courses: [
          { code: "CSET215", name: "Graphics and Visual Computing", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", specialization: "Gaming" },
          { code: "CSET216", name: "UI/UX Design for Human Computer Interface", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", specialization: "UI/UX" },
          { code: "CSET236", name: "IoT Networks and Protocols", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", specialization: "IoT" },
          { code: "CSET237", name: "VR and 360 Video Production", credits: 4, ltp: "3-0-2", program: "B.Tech CSE", specialization: "AR/VR" },
          { code: "CSET242", name: "Advance Swift Programming for iOS", credits: 4, ltp: "2-0-4", program: "B.Tech CSE", specialization: "Mobile" },
        ]
      }
    ],
    allCourses: []
  };

  // 2. Structured B.B.A. LL.B. (Hons.) Catalog
  const lawCurriculum: ProgramCurriculum = {
    programName: "Bachelor of Business Administration & Bachelor of Laws (Honours)",
    degree: "B.B.A. LL.B. (Hons.)",
    school: "School of Law",
    duration: "5 Years (10 Semesters)",
    batch: "2023-2028",
    totalCredits: 237,
    semesters: [
      {
        semester: "Semester I",
        courses: [
          { code: "LLLB133L", name: "Legal Methods", credits: 4, category: "Core Law 01", program: "BBA LLB" },
          { code: "LLLB135L", name: "Law of Torts", credits: 4, category: "Core Law 02", program: "BBA LLB" },
          { code: "LLLB137L", name: "English I", credits: 4, category: "Language 01", program: "BBA LLB" },
          { code: "LBBL115L", name: "Theory and Practice of Management", credits: 4, category: "Core Foundation 01", program: "BBA LLB" },
          { code: "LBBL117L", name: "Economics I (Microeconomics)", credits: 4, category: "Core Foundation 02", program: "BBA LLB" },
          { code: "LBBL119L", name: "Marketing Management", credits: 4, category: "Core Foundation 03", program: "BBA LLB" }
        ]
      },
      {
        semester: "Semester II",
        courses: [
          { code: "LLLB134L", name: "Law of Contracts I", credits: 4, category: "Core Law 03", program: "BBA LLB" },
          { code: "LLLB136L", name: "English II", credits: 4, category: "Language 02", program: "BBA LLB" },
          { code: "LLLB138L", name: "Legal History", credits: 4, category: "Core Law 04", program: "BBA LLB" },
          { code: "LBBL116L", name: "Financial Accounting", credits: 4, category: "Core Foundation 04", program: "BBA LLB" },
          { code: "LBBL118L", name: "Human Resource Management", credits: 4, category: "Core Foundation 05", program: "BBA LLB" },
          { code: "LBBL120L", name: "Business Communication", credits: 4, category: "Core Foundation 06", program: "BBA LLB" },
          { code: "LLLB140L", name: "Clinic 1 - Moot Court & Trial Advocacy", credits: 1, category: "Clinic 01", program: "BBA LLB" }
        ]
      },
      {
        semester: "Semester III",
        courses: [
          { code: "LLLB229L", name: "Constitutional Law I", credits: 4, category: "Core Law 05", program: "BBA LLB" },
          { code: "LLLB233L", name: "Law of Contracts II (Special Contracts)", credits: 4, category: "Core Law 06", program: "BBA LLB" },
          { code: "LLLB235L", name: "Law of Crimes I (Indian Penal Code)", credits: 4, category: "Core Law 07", program: "BBA LLB" },
          { code: "LBBL207L", name: "Macroeconomics & Policy", credits: 4, category: "Core Foundation", program: "BBA LLB" },
          { code: "LBBL209L", name: "Organizational Behaviour", credits: 4, category: "Core Foundation", program: "BBA LLB" },
          { code: "LLLB196J", name: "Internship I (Non-Taught)", credits: 4, category: "Internship 01", program: "BBA LLB" }
        ]
      },
      {
        semester: "Semester IV",
        courses: [
          { code: "LLLB230L", name: "Constitutional Law II", credits: 4, category: "Core Law 08", program: "BBA LLB" },
          { code: "LLLB232L", name: "Family Law I (Marriage & Divorce)", credits: 4, category: "Core Law 09", program: "BBA LLB" },
          { code: "LLLB234L", name: "Interpretation of Statutes", credits: 4, category: "Core Law 10", program: "BBA LLB" },
          { code: "LLLB236L", name: "Law of Crimes II (Criminal Procedure Code)", credits: 4, category: "Core Law 11", program: "BBA LLB" },
          { code: "LBBL208L", name: "Financial Management", credits: 4, category: "Core Foundation 07", program: "BBA LLB" },
          { code: "LLLB231L", name: "Liberal Elective II / First Degree Paper", credits: 4, category: "Elective", program: "BBA LLB" }
        ]
      },
      {
        semester: "Semester V",
        courses: [
          { code: "LLLB325L", name: "Family Law II (Succession & Inheritance)", credits: 4, category: "Core Law 12", program: "BBA LLB" },
          { code: "LLLB327L", name: "Property Law & Transfer of Property Act", credits: 4, category: "Core Law 13", program: "BBA LLB" },
          { code: "LLLB329L", name: "Company Law I", credits: 4, category: "Core Law 14", program: "BBA LLB" },
          { code: "LLLB331L", name: "Administrative Law", credits: 4, category: "Core Law 15", program: "BBA LLB" },
          { code: "LLLB333L", name: "Jurisprudence (Legal Theory)", credits: 4, category: "Core Law 16", program: "BBA LLB" },
          { code: "LLLB296J", name: "Internship II (Non-Taught)", credits: 4, category: "Internship 02", program: "BBA LLB" }
        ]
      },
      {
        semester: "Semester VI",
        courses: [
          { code: "LLLB326L", name: "Company Law II & Corporate Restructuring", credits: 4, category: "Core Law 17", program: "BBA LLB" },
          { code: "LLLB328L", name: "Civil Procedure Code & Limitation Act", credits: 4, category: "Core Law 18", program: "BBA LLB" },
          { code: "LLLB330L", name: "Law of Evidence", credits: 4, category: "Core Law 19", program: "BBA LLB" },
          { code: "LLLB332L", name: "Environmental Law", credits: 4, category: "Core Law 20", program: "BBA LLB" },
          { code: "LLLB334L", name: "Alternative Dispute Resolution (ADR) & Arbitration", credits: 4, category: "Core Law 21", program: "BBA LLB" },
          { code: "LLLB336L", name: "Clinic 2 - Drafting, Pleading & Conveyancing", credits: 2, category: "Clinic 02", program: "BBA LLB" }
        ]
      },
      {
        semester: "Semester VII",
        courses: [
          { code: "LLLB411L", name: "Labour & Industrial Law I", credits: 4, category: "Core Law 23", program: "BBA LLB" },
          { code: "LLLB413L", name: "Intellectual Property Law (Patents, Trademarks, Copyright)", credits: 4, category: "Core Law 24", program: "BBA LLB" },
          { code: "LLLB415L", name: "Public International Law", credits: 4, category: "Core Law 25", program: "BBA LLB" },
          { code: "LLLB417L", name: "Liberal Elective III", credits: 4, category: "Elective", program: "BBA LLB" },
          { code: "Honours-I", name: "Honours Paper I (Corporate/Criminal/Constitutional Law)", credits: 4, category: "Honours", program: "BBA LLB" },
          { code: "Honours-II", name: "Honours Paper II (Corporate/Criminal/Constitutional Law)", credits: 4, category: "Honours", program: "BBA LLB" },
          { code: "LLLB396J", name: "Internship III (Non-Taught)", credits: 1, category: "Internship 03", program: "BBA LLB" }
        ]
      },
      {
        semester: "Semester VIII",
        courses: [
          { code: "LLLB414L", name: "Labour & Industrial Law II", credits: 4, category: "Core Law 26", program: "BBA LLB" },
          { code: "LLLB416L", name: "Principles of Taxation (Direct & Indirect Tax)", credits: 4, category: "Core Law 27", program: "BBA LLB" },
          { code: "LLLB418L", name: "Private International Law / Conflict of Laws", credits: 4, category: "Elective Law", program: "BBA LLB" },
          { code: "Honours-III", name: "Honours Paper III", credits: 4, category: "Honours", program: "BBA LLB" },
          { code: "Honours-IV", name: "Honours Paper IV", credits: 4, category: "Honours", program: "BBA LLB" },
          { code: "LLLB440L", name: "Clinic 3 - Professional Ethics & Professional Accounting System", credits: 3, category: "Clinic 03", program: "BBA LLB" }
        ]
      },
      {
        semester: "Semester IX",
        courses: [
          { code: "LLLB505L", name: "International Trade Law & WTO", credits: 4, category: "Core Law 28", program: "BBA LLB" },
          { code: "LLLB507L", name: "Human Rights Law & Humanitarian Law", credits: 4, category: "Core Law 29", program: "BBA LLB" },
          { code: "LLLB456L", name: "Competition Law", credits: 4, category: "Elective Law", program: "BBA LLB" },
          { code: "Honours-V", name: "Honours Paper V", credits: 4, category: "Honours", program: "BBA LLB" },
          { code: "Honours-VI", name: "Honours Paper VI", credits: 4, category: "Honours", program: "BBA LLB" },
          { code: "LLLB496I", name: "Internship IV (Non-Taught)", credits: 4, category: "Internship 04", program: "BBA LLB" }
        ]
      },
      {
        semester: "Semester X",
        courses: [
          { code: "LLLB502L", name: "Banking & Insurance Law", credits: 4, category: "Core Law 30", program: "BBA LLB" },
          { code: "LLLB504L", name: "Cyber Law & Information Technology Law", credits: 4, category: "Core Law 31", program: "BBA LLB" },
          { code: "Honours-VII", name: "Honours Paper VII", credits: 4, category: "Honours", program: "BBA LLB" },
          { code: "Honours-VIII", name: "Honours Paper VIII", credits: 4, category: "Honours", program: "BBA LLB" },
          { code: "LLLB540L", name: "Clinic 4 - Moot Court Exercise and Internship Report", credits: 4, category: "Clinic 04", program: "BBA LLB" },
          { code: "LLLB596J", name: "Internship V (Non-Taught)", credits: 4, category: "Internship 05", program: "BBA LLB" }
        ]
      }
    ],
    electives: [
      { code: "LLLB441L", name: "Corporate Governance", credits: 4, category: "Law Elective", program: "BBA LLB" },
      { code: "LLLB443L", name: "Citizenship & Emigration Law", credits: 4, category: "Law Elective", program: "BBA LLB" },
      { code: "LLLB445L", name: "Health Law & Bioethics", credits: 4, category: "Law Elective", program: "BBA LLB" },
      { code: "LLLB447L", name: "Comparative Constitutional Law", credits: 4, category: "Law Elective", program: "BBA LLB" },
      { code: "LLLB446L", name: "Mergers & Acquisitions Law", credits: 4, category: "Law Elective", program: "BBA LLB" },
      { code: "LLLB448L", name: "Victimology & Criminal Justice", credits: 4, category: "Law Elective", program: "BBA LLB" },
      { code: "LLLB460L", name: "Law of Patents & Trade Secrets", credits: 4, category: "Law Elective", program: "BBA LLB" },
      { code: "LLLB458L", name: "Internet & Digital Rights Law", credits: 4, category: "Law Elective", program: "BBA LLB" },
      { code: "LLLB456L", name: "Competition Law", credits: 4, category: "Law Elective", program: "BBA LLB" },
      { code: "LLLB450L", name: "Private International Law", credits: 4, category: "Law Elective", program: "BBA LLB" },
      { code: "LLLB546L", name: "Gender Justice and Law", credits: 4, category: "Law Elective", program: "BBA LLB" },
      { code: "LLLB452L", name: "Insurance Law & Regulations", credits: 4, category: "Law Elective", program: "BBA LLB" },
      { code: "LLLB503L", name: "Environmental Law & Policy", credits: 4, category: "Law Elective", program: "BBA LLB" },
      { code: "LLLB501L", name: "Human Rights Law", credits: 4, category: "Law Elective", program: "BBA LLB" },
      { code: "LLLB541L", name: "Social Discourses and Law", credits: 4, category: "Law Elective", program: "BBA LLB" }
    ],
    allCourses: []
  };

  // Aggregate all courses
  const btechAll: CourseEntry[] = [];
  btechCurriculum.semesters.forEach(s => btechAll.push(...s.courses));
  btechCurriculum.specializations?.forEach(sp => btechAll.push(...sp.courses));
  btechCurriculum.allCourses = btechAll;

  const lawAll: CourseEntry[] = [];
  lawCurriculum.semesters.forEach(s => lawAll.push(...s.courses));
  if (lawCurriculum.electives) lawAll.push(...lawCurriculum.electives);
  lawCurriculum.allCourses = lawAll;

  const catalog = {
    generatedAt: new Date().toISOString(),
    programs: {
      "btech-cse": btechCurriculum,
      "bba-llb": lawCurriculum
    },
    totalPrograms: 2,
    totalCourses: btechAll.length + lawAll.length
  };

  const outputPath = path.resolve(rootDir, "../../data/processed/curriculum-catalog.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2), "utf-8");

  console.log(`\nSuccessfully built Structured Curriculum Catalog:`);
  console.log(`- Programs: 2 (B.Tech CSE, BBA LLB Hons)`);
  console.log(`- B.Tech CSE Courses: ${btechAll.length}`);
  console.log(`- BBA LLB Courses: ${lawAll.length}`);
  console.log(`- Total Catalog Courses: ${catalog.totalCourses}`);
  console.log(`- Saved to: ${outputPath}`);

  return catalog;
}

extractCurriculumCatalog().catch(console.error);
