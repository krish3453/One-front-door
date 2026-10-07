import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MessMenuItem {
  menu_id: string;
  week_cycle: "A" | "B";
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  meal: "Breakfast" | "Lunch" | "Snacks" | "Dinner";
  item: string;
  calories_kcal: number;
  source_doc: string;
}

let messMenuCache: MessMenuItem[] | null = null;

function loadMessMenu(): MessMenuItem[] {
  if (messMenuCache) return messMenuCache;

  const candidatePaths = [
    path.join(__dirname, "mess_menu.json"),
    path.join(__dirname, "../../../src/rag/catalog", "mess_menu.json"),
    path.join(process.cwd(), "src/rag/catalog", "mess_menu.json"),
    path.join(process.cwd(), "apps/api/src/rag/catalog", "mess_menu.json"),
    path.join(process.cwd(), "mess_menu.json"),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, "utf-8");
        messMenuCache = JSON.parse(raw);
        return messMenuCache || [];
      } catch (err) {
        console.error(`[MessMenu] Error reading ${candidate}:`, err);
      }
    }
  }

  console.warn("[MessMenu] Warning: mess_menu.json could not be loaded.");
  messMenuCache = [];
  return messMenuCache;
}

export const MESS_FACILITY_INFO = {
  timings: {
    breakfast: "7:30 AM – 10:00 AM (Mon–Fri) | 8:00 AM – 10:30 AM (Sat–Sun)",
    lunch: "12:30 PM – 2:30 PM (Daily)",
    snacks: "4:30 PM – 6:00 PM (Daily)",
    dinner: "7:30 PM – 9:45 PM (Daily)",
  },
  location: "Central Student Dining Hall (Mess Block, 2-floor layout)",
  dayScholarRules:
    "Day scholars can dine by purchasing individual meal coupons at the counter or scanning their ERP app meal pass (approx ₹60 for Breakfast/Snacks, ₹90 for Lunch/Dinner).",
  guidelines:
    "Buffet style self-service; strictly no food removal outside the dining hall; biometric/ERP barcode verification at entry.",
};

export interface MessMenuFilterOptions {
  day?: string;
  meal?: "Breakfast" | "Lunch" | "Snacks" | "Dinner" | "All";
  weekCycle?: "A" | "B" | "All";
  search?: string;
}

/**
 * Query mess menu entries with flexible day, meal, week cycle, or item search
 */
export function queryMessMenu(options: MessMenuFilterOptions = {}): {
  items: MessMenuItem[];
  timings: typeof MESS_FACILITY_INFO.timings;
  facility: typeof MESS_FACILITY_INFO;
  totalCaloriesByMeal?: Record<string, number>;
} {
  const allItems = loadMessMenu();
  let filtered = [...allItems];

  // 1. Day filtering (case-insensitive substring or full match)
  if (options.day && options.day.toLowerCase() !== "all") {
    const dLower = options.day.toLowerCase().trim();
    filtered = filtered.filter((item) => item.day.toLowerCase().includes(dLower));
  }

  // 2. Meal filtering
  if (options.meal && options.meal !== "All") {
    const mLower = options.meal.toLowerCase().trim();
    filtered = filtered.filter((item) => item.meal.toLowerCase() === mLower);
  }

  // 3. Week cycle filtering (defaults to A if not specified or All)
  if (options.weekCycle && options.weekCycle !== "All") {
    const wUpper = options.weekCycle.toUpperCase();
    filtered = filtered.filter((item) => item.week_cycle === wUpper);
  }

  // 4. Keyword / dish search
  if (options.search) {
    const sLower = options.search.toLowerCase().trim();
    filtered = filtered.filter((item) =>
      item.item.toLowerCase().includes(sLower) ||
      item.meal.toLowerCase().includes(sLower) ||
      item.day.toLowerCase().includes(sLower)
    );
  }

  // Calculate calories per meal group if specific day is selected
  const totalCaloriesByMeal: Record<string, number> = {};
  for (const item of filtered) {
    const key = `${item.day} - ${item.meal} (Week ${item.week_cycle})`;
    totalCaloriesByMeal[key] = (totalCaloriesByMeal[key] || 0) + item.calories_kcal;
  }

  return {
    items: filtered,
    timings: MESS_FACILITY_INFO.timings,
    facility: MESS_FACILITY_INFO,
    totalCaloriesByMeal,
  };
}

/**
 * Searches when a specific food item is served across the entire mess cycle
 */
export function searchMessDishSchedule(dishName: string): {
  dish: string;
  schedule: Array<{
    week_cycle: string;
    day: string;
    meal: string;
    calories_kcal: number;
  }>;
} {
  const allItems = loadMessMenu();
  const q = dishName.toLowerCase().trim();

  const matching = allItems.filter((i) => i.item.toLowerCase().includes(q));

  return {
    dish: dishName,
    schedule: matching.map((m) => ({
      week_cycle: `Week ${m.week_cycle}`,
      day: m.day,
      meal: m.meal,
      calories_kcal: m.calories_kcal,
    })),
  };
}
