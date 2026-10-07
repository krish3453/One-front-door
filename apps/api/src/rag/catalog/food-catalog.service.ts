import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface OutletRecord {
  outlet_id: string;
  outlet_name: string;
  also_known_as?: string;
  name_status?: string;
  menu_sections: string;
  item_rows: number;
  veg_only: boolean;
  price_min_inr: number;
  price_median_inr: number;
  price_max_inr: number;
  famous_for_inferred: string;
  famous_basis?: string;
  source_images?: string;
}

export interface DishComparisonRecord {
  dish_group: string;
  outlets_count: number;
  cheapest_outlet: string;
  cheapest_price_inr: number;
  cheapest_variant?: string;
  all_options_cheapest_first: string;
  tagged_bestseller_at?: string;
  pick_basis?: string;
}

export interface MenuItemRecord {
  item_id: string;
  outlet_id: string;
  outlet_name: string;
  menu_section: string;
  item_name: string;
  dish_group: string;
  diet_type: string;
  variant?: string;
  price_inr: number;
  highlight_tag?: string;
  needs_check?: boolean;
  notes?: string;
}

// In-memory singletons loaded lazily
let outletsCache: OutletRecord[] | null = null;
let dishComparisonsCache: DishComparisonRecord[] | null = null;
let menuItemsCache: MenuItemRecord[] | null = null;

function readCatalogFile<T>(filename: string): T[] {
  const candidatePaths = [
    path.join(__dirname, filename),
    path.join(__dirname, "../../../src/rag/catalog", filename),
    path.join(process.cwd(), "src/rag/catalog", filename),
    path.join(process.cwd(), "apps/api/src/rag/catalog", filename),
    path.join(process.cwd(), filename),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, "utf-8");
        return JSON.parse(raw);
      } catch (err) {
        console.error(`[FoodCatalog] Error reading ${candidate}:`, err);
      }
    }
  }

  console.warn(`[FoodCatalog] Warning: ${filename} could not be found in any candidate path.`);
  return [];
}

function loadFoodCatalog() {
  if (!outletsCache) {
    outletsCache = readCatalogFile<OutletRecord>("outlets.json");
  }

  if (!dishComparisonsCache) {
    dishComparisonsCache = readCatalogFile<DishComparisonRecord>("dish_comparison.json");
  }

  if (!menuItemsCache) {
    menuItemsCache = readCatalogFile<MenuItemRecord>("menu_items.json");
  }
}

/**
 * Get list of all campus outlets
 */
export function getAllOutlets(): OutletRecord[] {
  loadFoodCatalog();
  return outletsCache || [];
}

/**
 * Get details for a specific outlet
 */
export function getOutletDetails(nameOrId: string): OutletRecord | null {
  loadFoodCatalog();
  if (!outletsCache) return null;

  const q = nameOrId.toLowerCase().trim();
  return (
    outletsCache.find(
      (o) =>
        o.outlet_id.toLowerCase() === q ||
        o.outlet_name.toLowerCase() === q ||
        o.outlet_name.toLowerCase().includes(q) ||
        (o.also_known_as && o.also_known_as.toLowerCase().includes(q))
    ) || null
  );
}

export function compareDishes(dishQuery: string): DishComparisonRecord[] {
  loadFoodCatalog();
  if (!dishComparisonsCache) return [];

  const q = dishQuery.toLowerCase().trim();
  let matches = dishComparisonsCache.filter((d) =>
    d.dish_group.toLowerCase().includes(q)
  );

  if (matches.length === 0) {
    // Word token matching
    const words = q.split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 0) {
      matches = dishComparisonsCache.filter((d) => {
        const groupLower = d.dish_group.toLowerCase();
        return words.every((w) => groupLower.includes(w));
      });
    }
  }

  // Format all_options_cheapest_first with semicolons instead of pipes to avoid breaking markdown tables
  return matches.map((d) => ({
    ...d,
    all_options_cheapest_first: d.all_options_cheapest_first
      ? d.all_options_cheapest_first.replace(/\s*\|\s*/g, " ; ")
      : "",
  }));
}

/**
 * Search individual menu items with filters
 */
export function searchMenuItems(options: {
  query?: string;
  outletName?: string;
  maxPrice?: number;
  minPrice?: number;
  dietType?: "Veg" | "Non-Veg" | "All";
  limit?: number;
}): MenuItemRecord[] {
  loadFoodCatalog();
  if (!menuItemsCache) return [];

  let results = [...menuItemsCache];

  if (options.outletName) {
    const outQ = options.outletName.toLowerCase().trim();
    results = results.filter(
      (item) =>
        item.outlet_name.toLowerCase().includes(outQ) ||
        item.outlet_id.toLowerCase() === outQ
    );
  }

  if (options.query) {
    const q = options.query.toLowerCase().trim();
    const words = q.split(/\s+/).filter((w) => w.length > 2);
    results = results.filter((item) => {
      const name = item.item_name.toLowerCase();
      const group = item.dish_group.toLowerCase();
      const section = item.menu_section.toLowerCase();
      return (
        name.includes(q) ||
        group.includes(q) ||
        section.includes(q) ||
        (words.length > 0 && words.every((w) => name.includes(w) || group.includes(w)))
      );
    });
  }

  if (options.dietType && options.dietType !== "All") {
    results = results.filter(
      (item) => item.diet_type.toLowerCase() === options.dietType!.toLowerCase()
    );
  }

  if (options.maxPrice !== undefined) {
    results = results.filter((item) => item.price_inr <= options.maxPrice!);
  }

  if (options.minPrice !== undefined) {
    results = results.filter((item) => item.price_inr >= options.minPrice!);
  }

  // Sort cheapest first
  results.sort((a, b) => a.price_inr - b.price_inr);

  return results.slice(0, options.limit || 25);
}

/**
 * High-level search for the Campus Agent that generates structured Markdown summaries
 */
export function queryFoodCatalog(question: string): {
  matched: boolean;
  type: "outlet" | "comparison" | "search" | "general";
  summaryText: string;
} | null {
  loadFoodCatalog();
  const q = question.toLowerCase();

  // 1. Cross-Outlet Price Comparison detection
  if (
    q.includes("compare") ||
    q.includes("cheapest") ||
    q.includes("best price") ||
    q.includes("where can i get") ||
    q.includes("lowest price") ||
    q.includes("price of") ||
    q.includes("rate of") ||
    q.includes("cost of") ||
    q.includes("how much is") ||
    q.includes("how much does")
  ) {
    // Extract dish name keywords
    const cleaned = question
      .replace(
        /(compare|cheapest|best price|where can i get|lowest price|price of|rate of|cost of|how much is|how much does|across outlets|on campus|\?)/gi,
        ""
      )
      .trim();

    if (cleaned.length >= 2) {
      const comparisons = compareDishes(cleaned);
      if (comparisons.length > 0) {
        const lines = comparisons.slice(0, 8).map((c) => {
          let str = `• **${c.dish_group}**:\n  - Cheapest at **${c.cheapest_outlet}** for **₹${c.cheapest_price_inr}** ${
            c.cheapest_variant ? `(${c.cheapest_variant})` : ""
          }\n  - All options: ${c.all_options_cheapest_first}`;
          if (c.tagged_bestseller_at) {
            str += `\n  - ⭐ Tagged Best Seller at: ${c.tagged_bestseller_at}`;
          }
          return str;
        });

        return {
          matched: true,
          type: "comparison",
          summaryText: `### 🍽️ Campus Dish & Price Comparison\n\n${lines.join("\n\n")}`,
        };
      }
    }
  }

  // 2. Outlet Specific Search
  if (outletsCache) {
    for (const outlet of outletsCache) {
      if (
        q.includes(outlet.outlet_name.toLowerCase()) ||
        (outlet.also_known_as &&
          outlet.also_known_as
            .split(";")
            .some((aka) => aka.trim().length > 2 && q.includes(aka.trim().toLowerCase())))
      ) {
        const topItems = searchMenuItems({
          outletName: outlet.outlet_name,
          limit: 12,
        });

        const itemsList = topItems
          .map(
            (i) =>
              `- **${i.item_name}** ${i.variant ? `(${i.variant})` : ""}: ₹${i.price_inr} [${i.diet_type}]${
                i.highlight_tag ? ` ⭐ *${i.highlight_tag}*` : ""
              }`
          )
          .join("\n");

        return {
          matched: true,
          type: "outlet",
          summaryText: `### 🏪 ${outlet.outlet_name} (Campus Food Outlet)\n\n` +
            `• **Menu Sections**: ${outlet.menu_sections}\n` +
            `• **Price Range**: ₹${outlet.price_min_inr} – ₹${outlet.price_max_inr} (Median: ₹${outlet.price_median_inr})\n` +
            `• **Dietary Options**: ${outlet.veg_only ? "Pure Veg Only" : "Veg & Non-Veg Available"}\n` +
            `• **Famous For / Speciality**: ${outlet.famous_for_inferred}\n\n` +
            `#### 📋 Sample Menu & Pricing:\n${itemsList}`,
        };
      }
    }
  }

  // 3. General Dish / Item Query
  const menuResults = searchMenuItems({ query: question, limit: 12 });
  if (menuResults.length > 0 && (q.includes("food") || q.includes("menu") || q.includes("eat") || q.includes("order") || q.includes("dish") || q.includes("snack") || q.includes("drink") || q.includes("coffee") || q.includes("tea") || q.includes("maggi") || q.includes("burger") || q.includes("roll") || q.includes("pizza") || q.includes("paratha") || q.includes("shake") || q.includes("meal"))) {
    const itemsList = menuResults
      .map(
        (i) =>
          `- **${i.item_name}** at **${i.outlet_name}**: ₹${i.price_inr} [${i.diet_type}] ${
            i.variant ? `(${i.variant})` : ""
          }${i.highlight_tag ? ` ⭐ *${i.highlight_tag}*` : ""}`
      )
      .join("\n");

    return {
      matched: true,
      type: "search",
      summaryText: `### 🍴 Available Campus Menu Items & Pricing\n\n${itemsList}`,
    };
  }

  return null;
}
