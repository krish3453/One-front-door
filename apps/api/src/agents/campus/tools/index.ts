import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { searchLocations } from "./search-locations.js";
import { getLocationDetails } from "./get-location-details.js";
import { searchDining } from "./search-dining.js";
import { getDiningHours } from "./get-dining-hours.js";
import { searchCampusServices } from "./search-campus-services.js";
import { getEmergencyContacts } from "./get-emergency-contacts.js";
import { searchCampusRules } from "./search-campus-rules.js";
import { calculateAttendance } from "../../tools/attendance-calculator.js";
import { generateAcademicPetition } from "../../tools/petition-generator.js";

export const campusTools = [
  tool(
    async ({ attended, conducted, targetPercentage, subjectName }) => {
      return JSON.stringify(
        calculateAttendance({
          attended,
          conducted,
          targetPercentage,
          subjectName,
        })
      );
    },
    {
      name: "calculate_attendance_and_bunk_planner",
      description:
        "Accurately calculate current student attendance percentage, safe classes remaining to bunk/skip while staying above the university minimum threshold (75%), and recovery plan if attendance is below 75%.",
      schema: z.object({
        attended: z.number().describe("Number of classes attended by the student"),
        conducted: z.number().describe("Total number of classes conducted"),
        targetPercentage: z.number().optional().describe("Target attendance percentage, default is 75"),
        subjectName: z.string().optional().describe("Name or code of the course/subject"),
      }),
    }
  ),

  tool(
    async ({ petitionType, reason, courseOrSubject, studentName, enrollmentNo, datesOrDetails }) => {
      return JSON.stringify(
        generateAcademicPetition({
          petitionType,
          reason,
          courseOrSubject,
          studentName,
          enrollmentNo,
          datesOrDetails,
        })
      );
    },
    {
      name: "draft_formal_academic_petition",
      description:
        "Generate a formal, ready-to-submit university petition, makeup exam application, medical leave attendance condonation letter, course drop request, or hostel outpass letter with relevant regulations cited.",
      schema: z.object({
        petitionType: z.enum([
          "medical_leave",
          "makeup_exam",
          "attendance_condonation",
          "course_drop",
          "hostel_leave",
          "general",
        ]).describe("Type of academic petition"),
        reason: z.string().describe("Specific reason or context for the request"),
        courseOrSubject: z.string().optional().describe("Course or subject name/code"),
        studentName: z.string().optional().describe("Student's full name"),
        enrollmentNo: z.string().optional().describe("Student enrollment number"),
        datesOrDetails: z.string().optional().describe("Specific dates or duration of absence/leave"),
      }),
    }
  ),

  tool(
    async ({ query }) => {
      return JSON.stringify(await searchCampusRules(query));
    },
    {
      name: "search_campus_rules_and_policies",
      description:
        "Search Bennett University official student discipline rules, code of conduct, policies (such as alcohol, smoking, drugs, breathalyzer, hostel curfew, ragging, gate pass, penalties, fines), and campus regulations.",
      schema: z.object({
        query: z
          .string()
          .describe(
            "The specific rule, misconduct, policy, or conduct topic to search for"
          ),
      }),
    }
  ),

  tool(
    async ({ query }) => {
      return JSON.stringify(await searchLocations(query));
    },
    {
      name: "search_locations",
      description:
        "Search Bennett University campus locations such as libraries, sports facilities, cafeterias, and other places.",
      schema: z.object({
        query: z
          .string()
          .describe("Location name, category, or keyword to search for"),
      }),
    }
  ),

  tool(
    async ({ locationId }) => {
      return JSON.stringify(await getLocationDetails(locationId));
    },
    {
      name: "get_location_details",
      description:
        "Get detailed information about a specific Bennett University campus location using its ID.",
      schema: z.object({
        locationId: z
          .string()
          .describe("The exact campus location ID"),
      }),
    }
  ),

  tool(
    async ({ query }) => {
      return JSON.stringify(await searchDining(query));
    },
    {
      name: "search_dining",
      description:
        "Search Bennett University dining outlets such as restaurants, cafeterias, and food joints.",
      schema: z.object({
        query: z
          .string()
          .describe("Dining outlet name, type, or keyword"),
      }),
    }
  ),

  tool(
    async ({ diningId }) => {
       return JSON.stringify(await getDiningHours(diningId));
    },
    {
      name: "get_dining_hours",
      description:
        "Get the stored operating hours for a specific campus dining outlet.",
      schema: z.object({
        diningId: z
          .string()
          .describe("The exact dining outlet ID"),
      }),
    }
  ),

  tool(
    async ({ query }) => {
       return JSON.stringify(await searchCampusServices(query));
    },
    {
      name: "search_campus_services",
      description:
        "Search Bennett University campus services such as healthcare, counselling, transportation, banking, and convenience services.",
      schema: z.object({
        query: z
          .string()
          .describe("Service name, category, or keyword"),
      }),
    }
  ),

  tool(
    async ({ category }) => {
      return JSON.stringify(await getEmergencyContacts(category));
    },
    {
      name: "get_emergency_contacts",
      description:
        "Get emergency and important campus contact numbers. Optionally filter by category such as medical.",
      schema: z.object({
        category: z
          .string()
          .optional()
          .describe("Optional emergency contact category"),
      }),
    }
  ),
];