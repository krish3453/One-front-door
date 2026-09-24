import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { searchLocations } from "./search-locations.js";
import { getLocationDetails } from "./get-location-details.js";
import { searchDining } from "./search-dining.js";
import { getDiningHours } from "./get-dining-hours.js";
import { searchCampusServices } from "./search-campus-services.js";
import { getEmergencyContacts } from "./get-emergency-contacts.js";

export const campusTools = [
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