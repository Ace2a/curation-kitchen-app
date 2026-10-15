/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PantryItem, Recipe } from "../types";

/**
 * Strips recipe measurement amounts (e.g., "1 cup", "1/2 cup", "2 tbsp", "a pinch")
 * and extracts only the clean, capitalized product title (e.g., "Heavy Cream", "Cheddar Cheese").
 */
export function cleanIngredientTitle(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  let s = raw.trim();

  // 1. Remove parenthetical notes like (bone-in, skinless), (washed and chopped), (diced), etc.
  s = s.replace(/\([^)]*\)/g, " ");

  // 2. Remove preparation or notes after a comma (e.g., "tomatoes, sliced", "salt, to taste")
  s = s.replace(/,.*$/, " ");

  // 3. Remove "to taste", "as needed", "optional"
  s = s.replace(/\b(?:to\s+taste|as\s+needed|or\s+more|optional|divided)\b/gi, " ");

  // 4. Remove unicode fractions
  s = s.replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g, " ");

  // 5. Remove compound fractions and decimal numbers (e.g., "3 1/2", "1/2", "2.5", "1")
  s = s.replace(/\b\d+\s*\/\s*\d+\b/g, " ");
  s = s.replace(/\b\d+\s+(?=\d+\/)/g, " ");
  s = s.replace(/\b\d+(?:\.\d+)?\b/g, " ");

  // 6. Remove colloquial prefix measurements
  s = s.replace(/\b(?:a\s+)?(?:pinch|dash|handful|touch)\s+of\b/gi, " ");

  // 7. Remove cooking and grocery measurement units
  const units = "cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|fl\\s*oz|g|grams?|kg|kilos?|kilograms?|ml|milliliters?|millilitres?|l|liters?|litres?|pinch(?:es)?|dash(?:es)?|heads?|cloves?|stalks?|bunches?|bunch|cans?|jars?|bottles?|packages?|pkgs?|slices?|pieces?|handfuls?|sprigs?";
  s = s.replace(new RegExp(`\\b(?:${units})\\b`, "gi"), " ");

  // 8. Remove size descriptors
  s = s.replace(/\b(?:small|medium|large|extra-large|jumbo)\b/gi, " ");

  // 9. Remove dangling "of" (e.g., "of flour", "of kosher salt")
  s = s.replace(/\bof\b/gi, " ");

  // 10. Remove punctuation except hyphens
  s = s.replace(/[^\w\s-]/g, " ");

  // 11. Normalize spaces
  s = s.replace(/\s+/g, " ").trim();

  // 12. Format into clean Title Case
  s = s
    .split(" ")
    .map((word) => {
      if (!word) return "";
      if (word.includes("-")) {
        return word
          .split("-")
          .map((sub) => sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase())
          .join("-");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  return s;
}

/**
 * Strict canonical normalization to deduplicate overlapping ingredient variations:
 * - "Salt and Pepper", "Salt and Black Pepper", "Kosher Salt", "Sea Salt" -> "Salt"
 * - "Olive Oil", "Extra Virgin Olive Oil" -> "Olive Oil"
 */
export function canonicalizeIngredientName(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  const cleaned = cleanIngredientTitle(raw) || raw.trim();
  const lower = cleaned.toLowerCase();

  // 1. Strict Salt deduplication:
  if (
    lower === "salt and pepper" ||
    lower === "salt and black pepper" ||
    lower === "salt & pepper" ||
    lower === "salt & black pepper" ||
    lower === "kosher salt" ||
    lower === "sea salt" ||
    lower === "fine sea salt" ||
    lower === "coarse sea salt" ||
    lower === "table salt" ||
    lower === "flaky sea salt" ||
    lower === "himalayan salt" ||
    lower === "pink salt" ||
    lower === "iodized salt" ||
    lower === "salt"
  ) {
    return "Salt";
  }

  // 2. Strict Olive Oil deduplication:
  if (
    lower === "olive oil" ||
    lower === "extra virgin olive oil" ||
    lower === "extra-virgin olive oil" ||
    lower === "evoo" ||
    lower === "virgin olive oil" ||
    lower === "pure olive oil"
  ) {
    return "Olive Oil";
  }

  // 3. Black Pepper variations
  if (
    lower === "black pepper" ||
    lower === "freshly ground black pepper" ||
    lower === "ground black pepper" ||
    lower === "coarse black pepper"
  ) {
    return "Black Pepper";
  }

  // 4. Garlic variations
  if (
    lower === "garlic" ||
    lower === "garlic cloves" ||
    lower === "garlic clove" ||
    lower === "fresh garlic" ||
    lower === "cloves garlic" ||
    lower === "minced garlic"
  ) {
    return "Garlic";
  }

  // 5. Heavy Cream variations
  if (
    lower === "heavy cream" ||
    lower === "heavy whipping cream" ||
    lower === "whipping cream"
  ) {
    return "Heavy Cream";
  }

  // 6. Flour variations
  if (
    lower === "all-purpose flour" ||
    lower === "all purpose flour" ||
    lower === "plain flour" ||
    lower === "wheat flour"
  ) {
    return "Flour";
  }

  // 7. Egg parts to whole eggs mapping
  if (
    lower === "egg" ||
    lower === "eggs" ||
    lower === "egg yolk" ||
    lower === "egg yolks" ||
    lower === "egg white" ||
    lower === "egg whites" ||
    lower === "beaten egg" ||
    lower === "beaten eggs" ||
    lower === "whisked egg" ||
    lower === "whisked eggs" ||
    lower === "large egg" ||
    lower === "large eggs" ||
    lower === "whole egg" ||
    lower === "whole eggs" ||
    lower === "raw egg" ||
    lower === "raw eggs"
  ) {
    return "Eggs";
  }

  return cleaned;
}

// ============================================================================
// DATE-TRACKING & FRESHNESS WARNING ENGINE
// ============================================================================

export interface FreshnessInfo {
  isNearingUseBy: boolean;           // True if within 3 days or expired
  isExpired: boolean;                // True if past use-by date
  daysRemaining: number;             // Days remaining until use-by date (negative if past)
  useByDateString: string;           // Formatted use-by date display (e.g. "Oct 10, 2026")
  purchaseDateString: string;        // Formatted purchase date display (e.g. "Sep 28, 2026")
  rawUseByDate: string;              // ISO string or YYYY-MM-DD
  rawPurchaseDate: string;           // ISO string or YYYY-MM-DD
  shelfLifeDays: number;             // Estimated shelf life in days
  badgeLabel: string;                // e.g. "Freshness Warning", "Past Use-By", "Fresh"
  urgency: "fresh" | "warning" | "expired";
}

/**
 * Returns estimated culinary shelf-life duration in days based on ingredient title and department.
 */
export function calculateEstimatedShelfLifeDays(name: string = "", category: string = ""): number {
  const lower = (name || "").toLowerCase();
  const catLower = (category || "").toLowerCase();

  // 1. Highly perishable dairy & liquid dairy
  if (lower.includes("heavy cream") || lower.includes("whipping cream") || lower.includes("half and half")) return 7;
  if (lower.includes("milk") || lower.includes("buttermilk")) return 7;
  if (lower.includes("yogurt") || lower.includes("sour cream") || lower.includes("cottage cheese")) return 10;
  if (lower.includes("parmesan") || lower.includes("cheddar") || lower.includes("cheese")) return 21;
  if (lower.includes("egg")) return 28;

  // 2. Fresh proteins & seafood
  if (lower.includes("fish") || lower.includes("salmon") || lower.includes("seafood") || lower.includes("shrimp")) return 2;
  if (lower.includes("chicken") || lower.includes("poultry") || lower.includes("turkey")) return 3;
  if (lower.includes("beef") || lower.includes("steak") || lower.includes("ground") || lower.includes("pork")) return 4;
  if (lower.includes("bacon") || lower.includes("sausage")) return 7;

  // 3. Fresh produce
  if (lower.includes("spinach") || lower.includes("lettuce") || lower.includes("salad") || lower.includes("kale") || lower.includes("herb") || lower.includes("cilantro") || lower.includes("parsley") || lower.includes("basil")) return 4;
  if (lower.includes("berry") || lower.includes("berries") || lower.includes("strawberry") || lower.includes("raspberry")) return 4;
  if (lower.includes("banana") || lower.includes("avocado") || lower.includes("tomato") || lower.includes("cucumber")) return 6;
  if (lower.includes("mushroom")) return 5;
  if (lower.includes("apple") || lower.includes("citrus") || lower.includes("lemon") || lower.includes("lime") || lower.includes("orange")) return 21;
  if (lower.includes("potato") || lower.includes("onion") || lower.includes("garlic") || lower.includes("carrot")) return 30;

  // 4. Bakery
  if (lower.includes("bread") || lower.includes("loaf") || lower.includes("bun") || lower.includes("pastry")) return 7;

  // 5. Long shelf-life pantry staples
  if (lower.includes("canned") || lower.includes("soup") || lower.includes("bean")) return 365;
  if (lower.includes("olive oil") || lower.includes("oil") || lower.includes("vinegar")) return 365;
  if (lower.includes("salt") || lower.includes("pepper") || lower.includes("spice") || lower.includes("powder")) return 365;
  if (lower.includes("flour") || lower.includes("pasta") || lower.includes("rice") || lower.includes("grain") || lower.includes("sugar")) return 180;

  // Department fallbacks
  if (catLower.includes("produce")) return 7;
  if (catLower.includes("dairy")) return 14;
  if (catLower.includes("protein")) return 4;
  if (catLower.includes("grain") || catLower.includes("baking")) return 180;
  if (catLower.includes("spice") || catLower.includes("oil")) return 365;
  if (catLower.includes("staple")) return 180;

  return 14;
}

/**
 * Calculates a default use-by date from a purchase / creation date.
 */
export function calculateDefaultUseByDate(purchaseDateIso: string, name: string = "", category: string = ""): string {
  const pDate = new Date(purchaseDateIso || Date.now());
  const validPDate = isNaN(pDate.getTime()) ? new Date() : pDate;
  const days = calculateEstimatedShelfLifeDays(name, category);
  const useBy = new Date(validPDate.getTime() + days * 24 * 60 * 60 * 1000);
  return useBy.toISOString();
}

/**
 * Computes comprehensive freshness and date tracking diagnostics for any pantry item.
 */
export function computeItemFreshness(
  item: {
    name?: string;
    item_name?: string;
    category?: string;
    date_added?: string;
    created_date?: string;
    purchase_date?: string | null;
    use_by_date?: string | null;
    shelf_life_days?: number | null;
  },
  referenceDate: Date = new Date()
): FreshnessInfo {
  const itemName = item.name || item.item_name || "";
  const category = item.category || "";

  // 1. Resolve Purchase Date
  const rawPurchase = item.purchase_date || item.date_added || item.created_date || new Date().toISOString();
  const parsedPurchase = new Date(rawPurchase);
  const validPurchase = isNaN(parsedPurchase.getTime()) ? new Date() : parsedPurchase;

  // 2. Resolve Shelf Life
  const shelfLifeDays = typeof item.shelf_life_days === "number" && item.shelf_life_days > 0
    ? item.shelf_life_days
    : calculateEstimatedShelfLifeDays(itemName, category);

  // 3. Resolve Use-By Date
  let validUseBy: Date;
  let rawUseBy: string;

  if (item.use_by_date) {
    const parsed = new Date(item.use_by_date);
    if (!isNaN(parsed.getTime())) {
      validUseBy = parsed;
      rawUseBy = item.use_by_date;
    } else {
      validUseBy = new Date(validPurchase.getTime() + shelfLifeDays * 24 * 60 * 60 * 1000);
      rawUseBy = validUseBy.toISOString();
    }
  } else {
    validUseBy = new Date(validPurchase.getTime() + shelfLifeDays * 24 * 60 * 60 * 1000);
    rawUseBy = validUseBy.toISOString();
  }

  // 4. Calculate Days Remaining relative to referenceDate
  const refTime = referenceDate.getTime();
  const diffMs = validUseBy.getTime() - refTime;
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const isExpired = daysRemaining < 0;
  const isNearingUseBy = daysRemaining <= 3;

  let urgency: "fresh" | "warning" | "expired" = "fresh";
  let badgeLabel = "Fresh";

  if (isExpired) {
    urgency = "expired";
    badgeLabel = "Past Use-By";
  } else if (isNearingUseBy) {
    urgency = "warning";
    badgeLabel = daysRemaining === 0 ? "Use Today" : daysRemaining === 1 ? "1 Day Left" : `${daysRemaining} Days Left`;
  }

  const formatDate = (d: Date) => {
    try {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return d.toISOString().split("T")[0];
    }
  };

  return {
    isNearingUseBy,
    isExpired,
    daysRemaining,
    useByDateString: formatDate(validUseBy),
    purchaseDateString: formatDate(validPurchase),
    rawUseByDate: rawUseBy,
    rawPurchaseDate: validPurchase.toISOString(),
    shelfLifeDays,
    badgeLabel,
    urgency
  };
}

export interface ConsolidatedPantryItem {
  id: string;
  allIds: string[];
  name: string;
  category: string;
  quantityNumber: number;
  quantityDisplay: string;
  status: "In Stock" | "Running Low" | "Out of Stock";
  created_date?: string;
  date_added?: string;
  purchase_date?: string | null;
  use_by_date?: string | null;
  shelf_life_days?: number | null;
  rawItem: PantryItem;
  freshness: FreshnessInfo;
}

/**
 * Consolidates pantry items by unique clean product name, merging duplicates
 * and summing their total quantities together if duplicates exist.
 * E.g.:
 * - "Salt and Pepper", "Salt and Black Pepper", "Kosher Salt", "Sea Salt" -> "Salt" (summed units)
 * - "Olive Oil", "Extra Virgin Olive Oil" -> "Olive Oil" (summed units)
 */
export function consolidatePantryItems(items: PantryItem[]): ConsolidatedPantryItem[] {
  const map = new Map<string, ConsolidatedPantryItem>();

  (items || []).forEach((item) => {
    let rawName = item.name || "";
    let cleanName = canonicalizeIngredientName(rawName);
    if (!cleanName) return;

    const key = cleanName.toLowerCase();

    // Parse numeric stock level
    let parsedNum = 0;
    if (typeof item.quantity === "number") {
      parsedNum = item.quantity;
    } else if (typeof item.quantity === "string") {
      const match = item.quantity.match(/-?\d+(\.\d+)?/);
      if (match) {
        parsedNum = parseFloat(match[0]);
      }
    }

    // Determine category
    let category = item.category || "Pantry Staples";
    if (cleanName === "Salt" || cleanName === "Olive Oil" || cleanName === "Black Pepper") {
      category = "Spices & Oils";
    }

    const itemFreshness = computeItemFreshness(item);

    if (!map.has(key)) {
      const isOut = item.status === "Out of Stock" || parsedNum <= 0;
      const initialQty = isOut ? 0 : parsedNum;
      const status: "In Stock" | "Running Low" | "Out of Stock" =
        initialQty <= 0
          ? "Out of Stock"
          : initialQty === 1
          ? (item.status === "Running Low" ? "Running Low" : "In Stock")
          : "In Stock";

      (map as any).set(key, {
        id: item.id,
        allIds: [item.id],
        name: cleanName,
        category: category,
        quantityNumber: initialQty,
        quantityDisplay: `${initialQty} ${initialQty === 1 ? "unit" : "units"}`,
        status: status,
        created_date: item.created_date,
        date_added: item.date_added,
        purchase_date: item.purchase_date || item.date_added || item.created_date,
        use_by_date: item.use_by_date || itemFreshness.rawUseByDate,
        shelf_life_days: item.shelf_life_days || itemFreshness.shelfLifeDays,
        rawItem: item,
        rawQuantities: [parsedNum],
        freshness: itemFreshness,
      });
    } else {
      const existing: any = map.get(key)!;
      existing.allIds.push(item.id);
      if (!existing.rawQuantities) {
        existing.rawQuantities = [existing.quantityNumber];
      }
      existing.rawQuantities.push(parsedNum);

      // Sum their total quantities together if duplicates exist
      const summedQty = existing.rawQuantities.reduce((a: number, b: number) => a + b, 0);
      existing.quantityNumber = summedQty;
      existing.quantityDisplay = `${summedQty} ${summedQty === 1 ? "unit" : "units"}`;

      if (summedQty > 0) {
        existing.status = summedQty === 1 ? "Running Low" : "In Stock";
      } else {
        existing.status = "Out of Stock";
      }

      // Upgrade category if appropriate
      if (
        (!existing.category || existing.category === "Other" || existing.category === "Pantry Staples") &&
        category &&
        category !== "Other" &&
        category !== "Pantry Staples"
      ) {
        existing.category = category;
      }

      // Keep the most urgent use-by date (the one that expires sooner)
      if (itemFreshness.daysRemaining < existing.freshness.daysRemaining) {
        existing.freshness = itemFreshness;
        existing.use_by_date = itemFreshness.rawUseByDate;
        existing.purchase_date = item.purchase_date || item.date_added;
      }
    }
  });

  return Array.from(map.values());
}

/**
 * Returns an accurate visual emoji for each pantry grocery product.
 */
export function getProductEmoji(category: string, name: string): string {
  const search = `${category} ${name}`.toLowerCase();
  if (search.includes("garlic") || search.includes("onion")) return "🧄";
  if (search.includes("cheese")) return "🧀";
  if (search.includes("cream") || search.includes("milk") || search.includes("dairy") || search.includes("yogurt") || search.includes("butter")) return "🥛";
  if (search.includes("steak") || search.includes("meat") || search.includes("chicken") || search.includes("beef") || search.includes("pork") || search.includes("poultry")) return "🥩";
  if (search.includes("salmon") || search.includes("fish") || search.includes("shrimp") || search.includes("tuna") || search.includes("anchovy")) return "🐟";
  if (search.includes("bread") || search.includes("sourdough") || search.includes("bakery")) return "🍞";
  if (search.includes("rice") || search.includes("flour") || search.includes("pasta") || search.includes("grain")) return "🌾";
  if (search.includes("oil") || search.includes("olive")) return "🫒";
  if (search.includes("salt") || search.includes("pepper") || search.includes("spice") || search.includes("curry") || search.includes("allspice") || search.includes("thyme") || search.includes("ginger")) return "🧂";
  if (search.includes("tomato")) return "🍅";
  if (search.includes("potato") || search.includes("carrot")) return "🥕";
  if (search.includes("lettuce") || search.includes("salad") || search.includes("spinach") || search.includes("greens")) return "🥬";
  if (search.includes("canned") || search.includes("bean") || search.includes("soup") || search.includes("broth")) return "🥫";
  if (search.includes("egg")) return "🥚";
  if (search.includes("avocado")) return "🥑";
  if (search.includes("honey") || search.includes("syrup")) return "🍯";
  return "🛒";
}

export interface IngredientMatchResult {
  rawText: string;
  cleanName: string;
  masterPantryName: string;
  requiredQuantity: number;
  availableQuantity: number;
  isSatisfied: boolean;
  stockStatus: "In Stock" | "Out of Stock";
  mappingNote: string;
  isEggPart: boolean;
}

export interface RecipePantryStatus {
  recipeId?: string;
  allSatisfied: boolean;
  satisfiedCount: number;
  totalIngredients: number;
  matchPercentage: number;
  ingredients: IngredientMatchResult[];
}

/**
 * Checks whether an ingredient represents egg parts (egg yolks, egg whites, beaten eggs)
 */
export function isEggPartIngredient(raw: string): boolean {
  if (!raw || typeof raw !== "string") return false;
  return /\b(egg\s*yolks?|egg\s*whites?|beaten\s*eggs?|whisked\s*eggs?|whole\s*eggs?|large\s*eggs?|eggs?)\b/i.test(raw);
}

/**
 * Parses numeric quantity from an ingredient string, handling fractions and decimals
 */
export function parseIngredientQuantity(raw: string): number {
  if (!raw || typeof raw !== "string") return 1;
  const s = raw.trim();

  const unicodeFractions: Record<string, number> = {
    "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 0.333, "⅔": 0.667, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875
  };
  for (const [char, val] of Object.entries(unicodeFractions)) {
    if (s.includes(char)) {
      const match = s.match(new RegExp(`(\\d+)?\\s*${char}`));
      if (match) {
        const whole = match[1] ? parseFloat(match[1]) : 0;
        return whole + val;
      }
      return val;
    }
  }

  const compMatch = s.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (compMatch) {
    return parseFloat(compMatch[1]) + parseFloat(compMatch[2]) / parseFloat(compMatch[3]);
  }

  const fracMatch = s.match(/^(\d+)\/(\d+)/);
  if (fracMatch) {
    return parseFloat(fracMatch[1]) / parseFloat(fracMatch[2]);
  }

  const decMatch = s.match(/^(\d+(?:\.\d+)?)/);
  if (decMatch) {
    return parseFloat(decMatch[1]);
  }

  const anyMatch = s.match(/\b(\d+(?:\.\d+)?)\b/);
  if (anyMatch) {
    return parseFloat(anyMatch[1]);
  }

  return 1;
}

/**
 * Evaluates a recipe ingredient against pantry inventory enforcing:
 * 1. MAP EGG PARTS TO WHOLE EGGS: "egg yolks", "egg whites", "beaten eggs" -> master pantry item "Eggs"
 * 2. QUANTITY RATIO MAPPING: 1:1 biometric substitution ratio: 1 egg yolk or egg white = 1 whole egg in pantry
 * 3. SUCCESS CRITERIA: If recipe calls for "3 egg yolks" and pantry has >= 3 Eggs, marks as fully satisfied and "In Stock".
 */
export function checkIngredientPantryMatch(
  ingredient: string | { name?: string; amount?: number; quantity?: number; unit?: string; raw?: string },
  pantryItems: Array<{ id?: string; name: string; quantity?: string | number; status?: string }>
): IngredientMatchResult {
  const rawText = typeof ingredient === "string" 
    ? ingredient 
    : (ingredient.raw || ingredient.name || "");

  const rawAmount = typeof ingredient === "object" && ingredient !== null
    ? (ingredient.amount ?? ingredient.quantity ?? null)
    : null;

  const isEgg = isEggPartIngredient(rawText);

  let requiredQuantity = 1;
  if (rawAmount !== null && typeof rawAmount === "number" && rawAmount > 0) {
    requiredQuantity = rawAmount;
  } else {
    requiredQuantity = parseIngredientQuantity(rawText);
  }

  // 1:1 Biometric substitution ratio:
  // 1 recipe requirement of an "egg yolk" or "egg white" equals 1 unit of a whole "Egg" in our pantry inventory.
  const targetRequiredInPantry = isEgg ? Math.ceil(requiredQuantity * 1) : requiredQuantity;
  const masterPantryName = isEgg ? "Eggs" : (canonicalizeIngredientName(cleanIngredientTitle(rawText)) || rawText);

  const matchedPantry = (pantryItems || []).find((p) => {
    const pCanon = canonicalizeIngredientName(p.name).toLowerCase();
    const targetCanon = masterPantryName.toLowerCase();
    return pCanon === targetCanon || pCanon.includes(targetCanon) || targetCanon.includes(pCanon);
  });

  let availableQuantity = 0;
  if (matchedPantry) {
    if ((matchedPantry as any).quantityNumber !== undefined && typeof (matchedPantry as any).quantityNumber === "number") {
      availableQuantity = (matchedPantry as any).quantityNumber;
    } else if (typeof matchedPantry.quantity === "number") {
      availableQuantity = matchedPantry.quantity;
    } else if (typeof matchedPantry.quantity === "string") {
      const match = matchedPantry.quantity.match(/-?\d+(\.\d+)?/);
      if (match) availableQuantity = parseFloat(match[0]);
    }
    if (matchedPantry.status === "Out of Stock" && availableQuantity <= 0) {
      availableQuantity = 0;
    }
  }

  const isSatisfied = availableQuantity >= targetRequiredInPantry && availableQuantity > 0;
  const stockStatus: "In Stock" | "Out of Stock" = isSatisfied ? "In Stock" : "Out of Stock";

  let mappingNote = "";
  if (isEgg) {
    mappingNote = isSatisfied
      ? `Mapped 1:1 to pantry Eggs: ${availableQuantity} units available (requires ${targetRequiredInPantry})`
      : `Requires ${targetRequiredInPantry} Eggs (${availableQuantity} available in pantry inventory)`;
  } else if (matchedPantry) {
    mappingNote = isSatisfied
      ? `In Stock: ${availableQuantity} units available in pantry`
      : `Out of Stock: requires ${targetRequiredInPantry} (${availableQuantity} available in pantry)`;
  } else {
    mappingNote = "Not currently tracked in pantry inventory";
  }

  return {
    rawText,
    cleanName: isEgg ? "Eggs" : masterPantryName,
    masterPantryName,
    requiredQuantity: targetRequiredInPantry,
    availableQuantity,
    isSatisfied,
    stockStatus,
    mappingNote,
    isEggPart: isEgg
  };
}

/**
 * Checks an entire recipe's ingredients against pantry inventory.
 */
export function checkRecipePantryStatus(
  recipe: { id?: string; ingredients?: any[] },
  pantryItems: Array<{ id?: string; name: string; quantity?: string | number; status?: string }>
): RecipePantryStatus {
  const rawIngredients = recipe.ingredients || [];
  const results = rawIngredients.map((ing) => checkIngredientPantryMatch(ing, pantryItems));

  const satisfiedCount = results.filter((r) => r.isSatisfied).length;
  const totalIngredients = results.length;
  const allSatisfied = totalIngredients > 0 && satisfiedCount === totalIngredients;
  const matchPercentage = totalIngredients > 0 ? Math.round((satisfiedCount / totalIngredients) * 100) : 0;

  return {
    recipeId: recipe.id,
    allSatisfied,
    satisfiedCount,
    totalIngredients,
    matchPercentage,
    ingredients: results
  };
}

export interface SmartRecipeSuggestion {
  recipe: Recipe;
  totalIngredients: number;
  inStockCount: number;
  missingCount: number;
  matchPercentage: number;
  canCookNow: boolean;
  isMinimalAddition: boolean; // missingCount <= 2
  inStockIngredients: Array<{ raw: string; masterKey: string; note: string; isEggPart?: boolean }>;
  missingIngredients: Array<{ raw: string; masterKey: string; requiredQuantity: number }>;
}

/**
 * Smart Suggestion Engine:
 * Recommends recipes to cook based on current pantry stock, highlighting dishes that can
 * be made with minimal additional ingredients (0, 1, or 2 missing ingredients).
 */
export function computeSmartRecipeSuggestions(
  recipes: Recipe[],
  pantryItems: Array<{ id?: string; name: string; quantity?: string | number; status?: string }>
): SmartRecipeSuggestion[] {
  return (recipes || [])
    .map((recipe) => {
      const rawIngredients = recipe.ingredients || [];
      if (rawIngredients.length === 0) return null;

      const inStockIngredients: Array<{ raw: string; masterKey: string; note: string; isEggPart?: boolean }> = [];
      const missingIngredients: Array<{ raw: string; masterKey: string; requiredQuantity: number }> = [];

      rawIngredients.forEach((ing) => {
        const match = checkIngredientPantryMatch(ing, pantryItems);
        if (match.isSatisfied) {
          inStockIngredients.push({
            raw: match.rawText,
            masterKey: match.masterPantryName,
            note: match.mappingNote,
            isEggPart: match.isEggPart
          });
        } else {
          missingIngredients.push({
            raw: match.rawText,
            masterKey: match.masterPantryName,
            requiredQuantity: match.requiredQuantity
          });
        }
      });

      const totalIngredients = rawIngredients.length;
      const inStockCount = inStockIngredients.length;
      const missingCount = missingIngredients.length;
      const matchPercentage = totalIngredients > 0 ? Math.round((inStockCount / totalIngredients) * 100) : 0;
      const canCookNow = missingCount === 0 && inStockCount > 0;
      const isMinimalAddition = missingCount > 0 && missingCount <= 2;

      return {
        recipe,
        totalIngredients,
        inStockCount,
        missingCount,
        matchPercentage,
        canCookNow,
        isMinimalAddition,
        inStockIngredients,
        missingIngredients
      };
    })
    .filter((item): item is SmartRecipeSuggestion => item !== null && item.inStockCount > 0)
    .sort((a, b) => {
      // 1. Ready to cook immediately first
      if (a.canCookNow && !b.canCookNow) return -1;
      if (!a.canCookNow && b.canCookNow) return 1;
      // 2. Least missing ingredients
      if (a.missingCount !== b.missingCount) return a.missingCount - b.missingCount;
      // 3. Highest match percentage
      return b.matchPercentage - a.matchPercentage;
    });
}
