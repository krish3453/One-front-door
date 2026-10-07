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
import {
  searchMenuItems,
  compareDishes,
  getOutletDetails,
  getAllOutlets,
} from "../../../rag/catalog/food-catalog.service.js";
import {
  queryMessMenu,
  searchMessDishSchedule,
  MESS_FACILITY_INFO,
} from "../../../rag/catalog/mess-menu.service.js";

export const campusTools = [
  tool(
    async ({ day, meal, weekCycle, dishQuery }) => {
      if (dishQuery) {
        const dishSchedule = searchMessDishSchedule(dishQuery);
        return JSON.stringify({
          queryType: "dish_schedule_search",
          ...dishSchedule,
          facility: MESS_FACILITY_INFO,
        });
      }

      const result = queryMessMenu({
        day,
        meal,
        weekCycle,
      });

      return JSON.stringify({
        queryType: "mess_menu_listing",
        filter: { day: day || "All", meal: meal || "All", weekCycle: weekCycle || "All" },
        totalItems: result.items.length,
        items: result.items,
        totalCaloriesByMeal: result.totalCaloriesByMeal,
        facility: MESS_FACILITY_INFO,
      });
    },
    {
      name: "get_campus_mess_menu",
      description:
        "Get the official Bennett University Student Mess Menu (Cycle A & B) with exact meal items, calories in kcal, meal timings (Breakfast, Lunch, Evening Snacks, Dinner), day scholar entry/coupon rules, and dish schedule (e.g. 'What is in today's mess lunch?', 'When is Chole Bhature or Dosa served in mess?', 'Show Monday mess menu with calories').",
      schema: z.object({
        day: z
          .string()
          .optional()
          .describe("Day of the week (e.g. 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') or 'All'"),
        meal: z
          .enum(["Breakfast", "Lunch", "Snacks", "Dinner", "All"])
          .optional()
          .describe("Specific meal time to filter by"),
        weekCycle: z
          .enum(["A", "B", "All"])
          .optional()
          .describe("Mess rotation week cycle (A or B, default is A or All)"),
        dishQuery: z
          .string()
          .optional()
          .describe("Specific dish or food item to find out when it is scheduled in the mess (e.g., 'Chole Bhature', 'Paneer Butter Masala', 'Dosa', 'Idli', 'Egg Curry', 'Gulab Jamun')"),
      }),
    }
  ),

  tool(
    async ({ dishName }) => {
      const results = compareDishes(dishName);
      if (!results || results.length === 0) {
        return JSON.stringify({
          found: false,
          message: `No cross-outlet price comparisons found specifically for '${dishName}'. Try searching menu items with search_campus_food_menu.`,
        });
      }
      return JSON.stringify({
        found: true,
        dishName,
        comparisons: results,
      });
    },
    {
      name: "compare_campus_dishes",
      description:
        "Compare prices and options for dishes/drinks across all campus food outlets (SnapEats, House of Chow, Infinity Kitchens, Quench, Southern Stories, etc.) to find the cheapest outlet, exact price in ₹ INR, and sorted list of all options.",
      schema: z.object({
        dishName: z
          .string()
          .describe("The name or category of the dish to compare across outlets (e.g., 'cold coffee', 'maggi', 'burger', 'kathi roll', 'paneer butter masala', 'tea', 'fried rice', 'shake')"),
      }),
    }
  ),

  tool(
    async ({ query, outletName, dietType, maxPrice, minPrice, limit }) => {
      const items = searchMenuItems({
        query,
        outletName,
        dietType,
        maxPrice,
        minPrice,
        limit: limit || 15,
      });
      return JSON.stringify({
        totalFound: items.length,
        items,
      });
    },
    {
      name: "search_campus_food_menu",
      description:
        "Search individual food & beverage items across Bennett University food outlets with exact prices in ₹ INR, dietary type (Veg / Non-Veg), variant sizes, and highlight tags (Best Seller / Must Try). Can filter by query, outlet name, max price, or diet type.",
      schema: z.object({
        query: z
          .string()
          .optional()
          .describe("Food item name or keyword (e.g., 'peri peri fries', 'paneer tikka roll', 'iced latte', 'dosa')"),
        outletName: z
          .string()
          .optional()
          .describe("Filter by specific outlet name (e.g. 'SnapEats', 'House of Chow', 'Infinity Kitchens', 'Quench', 'Southern Stories')"),
        dietType: z
          .enum(["Veg", "Non-Veg", "All"])
          .optional()
          .describe("Filter by dietary preference"),
        maxPrice: z
          .number()
          .optional()
          .describe("Maximum price in INR"),
        minPrice: z
          .number()
          .optional()
          .describe("Minimum price in INR"),
        limit: z
          .number()
          .optional()
          .describe("Number of items to return (default 15)"),
      }),
    }
  ),

  tool(
    async ({ outletNameOrId }) => {
      if (!outletNameOrId || outletNameOrId.toLowerCase() === "all") {
        const allOutlets = getAllOutlets();
        return JSON.stringify(allOutlets);
      }
      const outlet = getOutletDetails(outletNameOrId);
      if (!outlet) {
        return JSON.stringify({
          found: false,
          message: `Outlet '${outletNameOrId}' not found. Available outlets: SnapEats, House of Chow, Infinity Kitchens, Quench, Southern Stories, etc.`,
        });
      }
      const sampleItems = searchMenuItems({ outletName: outlet.outlet_name, limit: 10 });
      return JSON.stringify({
        found: true,
        outlet,
        sampleItems,
      });
    },
    {
      name: "get_campus_food_outlet_details",
      description:
        "Get detailed information about a campus food outlet at Bennett University, including price range (min/median/max), menu sections, veg-only status, famous specialties/best sellers, and sample menu.",
      schema: z.object({
        outletNameOrId: z
          .string()
          .describe("Name or ID of the campus food outlet (e.g. 'SnapEats', 'House of Chow', 'HOC', 'Infinity Kitchens', 'Kathi', 'Quench', 'Southern Stories') or 'all' for summary of all outlets"),
      }),
    }
  ),

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
        await generateAcademicPetition({
          petitionType,
          reason,
          courseOrSubject,
          studentName,
          enrollmentNo,
          datesOrDetails,
        }, reason)
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
          "room_change",
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
        "Search Bennett University official campus knowledge base: campus map navigation & routes (building-to-building, gate-to-building, hostels), floor directories, hostel infrastructure (C1-C12 & D1-D6 floors, dedicated lifts, ID card strips), food outlets & late-night/24-hour food (Quench, Maggi Hotspot, Snap Eats, Infinity Kitchen/Kathi, Green Nox, Tuck Shop), mess & dining facility, Student Council (BUSC), clubs, DSA, fests (Uphoria), and discipline/conduct policies.",
      schema: z.object({
        query: z
          .string()
          .describe(
            "The specific campus topic, navigation route, building floor, hostel, food outlet, mess rule, club, council, or policy to search for"
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