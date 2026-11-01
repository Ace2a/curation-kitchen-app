/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PantryItem, Recipe, RecipeIngredient } from "../types";

// ============================================================================
// FRACTION & DECIMAL EXTRACTION ENGINE
// ============================================================================

/**
 * Unicode vulgar fraction map for culinary recipes.
 */
const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

/**
 * Standard culinary unit normalization dictionary.
 */
const UNIT_CANONICAL_MAP: Record<string, string> = {
  // Volume - Spoons
  tsp: "tsp",
  tsps: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tbsp: "tbsp",
  tbsps: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tbs: "tbsp",

  // Volume - Cups & Liquid
  c: "cup",
  cup: "cup",
  cups: "cup",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  "fl oz": "fl oz",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
  pt: "pint",
  pint: "pint",
  pints: "pint",
  qt: "quart",
  quart: "quart",
  quarts: "quart",
  gal: "gallon",
  gallon: "gallon",
  gallons: "gallon",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  l: "liter",
  liter: "liter",
  liters: "liter",
  litre: "liter",
  litres: "liter",

  // Weight
  lb: "lbs",
  lbs: "lbs",
  pound: "lbs",
  pounds: "lbs",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",

  // Discrete / Packaging
  clove: "clove",
  cloves: "clove",
  head: "head",
  heads: "head",
  stalk: "stalk",
  stalks: "stalk",
  bunch: "bunch",
  bunches: "bunch",
  can: "can",
  cans: "can",
  jar: "jar",
  jars: "jar",
  bottle: "bottle",
  bottles: "bottle",
  pack: "pack",
  package: "pack",
  packages: "pack",
  slice: "slice",
  slices: "slice",
  pinch: "pinch",
  pinches: "pinch",
  dash: "dash",
  dashes: "dash",
  piece: "units",
  pieces: "units",
  unit: "units",
  units: "units",
};

/**
 * Common culinary prep descriptors to strip when extracting ingredient names.
 */
const DESCRIPTOR_MODIFIERS = [
  "chopped",
  "finely chopped",
  "roughly chopped",
  "diced",
  "minced",
  "sliced",
  "thinly sliced",
  "grated",
  "freshly grated",
  "shredded",
  "crushed",
  "peeled",
  "seeded",
  "stemmed",
  "trimmed",
  "melted",
  "softened",
  "cooked",
  "uncooked",
  "boiled",
  "roasted",
  "toasted",
  "warm",
  "cold",
  "chilled",
  "room temperature",
  "fresh",
  "dry",
  "dried",
  "ground",
  "freshly ground",
  "organic",
  "kosher",
  "extra-virgin",
  "extra virgin",
  "boneless",
  "skinless",
  "all-purpose",
  "all purpose",
  "divided",
  "optional",
  "to taste",
  "as needed",
  "for garnish",
];

export interface NormalizedQuantityResult {
  amount: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  unit: string | null;
  normalizedUnit: string | null;
  remainingText: string;
}

export interface NormalizedIngredient {
  raw: string;
  name: string;
  canonicalName: string;
  amount: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  unit: string | null;
  normalizedUnit: string | null;
  modifiers: string[];
}

/**
 * Parses numeric fractions, mixed numbers, and decimals into a float.
 * Examples:
 * - "1 1/2" -> 1.5
 * - "3/4" -> 0.75
 * - "2.5" -> 2.5
 * - "½" -> 0.5
 * - "1 ½" -> 1.5
 */
export function parseFractionOrDecimal(input: string): number | null {
  if (!input) return null;
  let text = input.trim();

  // 1. Check for single unicode fraction
  if (UNICODE_FRACTIONS[text] !== undefined) {
    return UNICODE_FRACTIONS[text];
  }

  // 2. Check for integer + unicode fraction (e.g. "1 ½")
  const mixedUnicodeMatch = text.match(/^(\d+)\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/);
  if (mixedUnicodeMatch) {
    const whole = parseInt(mixedUnicodeMatch[1], 10);
    const frac = UNICODE_FRACTIONS[mixedUnicodeMatch[2]] || 0;
    return whole + frac;
  }

  // Replace any embedded unicode fractions with ASCII decimals
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (text.includes(char)) {
      text = text.replace(char, ` ${val} `);
    }
  }

  // 3. Mixed fraction format: e.g. "1 1/2" or "2-1/2"
  const mixedMatch = text.match(/^(\d+)\s*[- ]\s*(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const num = parseFloat(mixedMatch[2]);
    const den = parseFloat(mixedMatch[3]);
    if (den !== 0) {
      return whole + num / den;
    }
  }

  // 4. Simple fraction format: e.g. "3/4"
  const fracMatch = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    if (den !== 0) {
      return num / den;
    }
  }

  // 5. Standard decimal / integer
  const num = parseFloat(text);
  return isNaN(num) ? null : num;
}

/**
 * Extracts quantity range, decimal amount, and unit from raw ingredient string.
 */
export function extractQuantityAndUnit(raw: string): NormalizedQuantityResult {
  if (!raw || typeof raw !== "string") {
    return {
      amount: null,
      minAmount: null,
      maxAmount: null,
      unit: null,
      normalizedUnit: null,
      remainingText: "",
    };
  }

  let text = raw.trim();

  // Strip parenthetical content first for parsing
  text = text.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

  // Detect numeric range: e.g. "1 to 2", "1-2", "1 - 2", "1/2 to 3/4"
  const rangePattern = /^([\d./\s½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+)\s*(?:-|to)\s*([\d./\s½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+)\s*(.*)$/i;
  const rangeMatch = text.match(rangePattern);

  let amount: number | null = null;
  let minAmount: number | null = null;
  let maxAmount: number | null = null;
  let remaining = text;

  if (rangeMatch) {
    const minVal = parseFractionOrDecimal(rangeMatch[1]);
    const maxVal = parseFractionOrDecimal(rangeMatch[2]);
    if (minVal !== null && maxVal !== null) {
      minAmount = minVal;
      maxAmount = maxVal;
      amount = Number(((minVal + maxVal) / 2).toFixed(3));
      remaining = rangeMatch[3].trim();
    }
  }

  // If no range detected, extract leading quantity
  if (amount === null) {
    // Matches e.g. "1 1/2", "0.75", "1/4", "2", "½"
    const leadingQtyPattern = /^([\d./\s½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+(?:\s*\/\s*\d+)?)\s*(.*)$/;
    const qtyMatch = remaining.match(leadingQtyPattern);

    if (qtyMatch) {
      const parsed = parseFractionOrDecimal(qtyMatch[1]);
      if (parsed !== null && !isNaN(parsed)) {
        amount = parsed;
        minAmount = parsed;
        maxAmount = parsed;
        remaining = qtyMatch[2].trim();
      }
    }
  }

  // Extract unit from leading word of remaining
  let unit: string | null = null;
  let normalizedUnit: string | null = null;

  // Check 2-word units first (e.g. "fl oz", "fluid ounce")
  const words = remaining.split(/\s+/);
  if (words.length >= 2) {
    const twoWord = `${words[0]} ${words[1]}`.toLowerCase();
    if (UNIT_CANONICAL_MAP[twoWord]) {
      unit = `${words[0]} ${words[1]}`;
      normalizedUnit = UNIT_CANONICAL_MAP[twoWord];
      remaining = words.slice(2).join(" ").trim();
    }
  }

  // Check 1-word units
  if (!unit && words.length >= 1) {
    const firstWord = words[0].toLowerCase().replace(/[^\w]/g, "");
    if (UNIT_CANONICAL_MAP[firstWord]) {
      unit = words[0];
      normalizedUnit = UNIT_CANONICAL_MAP[firstWord];
      remaining = words.slice(1).join(" ").trim();
    }
  }

  // Strip connector words like "of" (e.g. "cup of flour" -> "flour")
  remaining = remaining.replace(/^of\s+/i, "").trim();

  return {
    amount,
    minAmount,
    maxAmount,
    unit,
    normalizedUnit,
    remainingText: remaining,
  };
}

// ============================================================================
// CANONICAL INGREDIENT NORMALIZATION
// ============================================================================

/**
 * Normalizes an ingredient string into clean canonical name and detected modifiers.
 */
export function normalizeIngredient(raw: string | RecipeIngredient): NormalizedIngredient {
  const rawString = typeof raw === "string" ? raw : raw.raw || `${raw.canonicalAmount || raw.minAmount || ""} ${raw.unit || ""} ${raw.name}`.trim();
  
  const qtyResult = extractQuantityAndUnit(rawString);
  let workingText = qtyResult.remainingText || (typeof raw === "object" ? raw.name : rawString);

  // Collect modifiers
  const detectedModifiers: string[] = [];
  const lowerWorking = workingText.toLowerCase();

  for (const mod of DESCRIPTOR_MODIFIERS) {
    const regex = new RegExp(`\\b${mod}\\b`, "gi");
    if (regex.test(lowerWorking)) {
      detectedModifiers.push(mod);
      workingText = workingText.replace(regex, " ");
    }
  }

  // Strip commas, preparation notes, parenthetical notes
  workingText = workingText.replace(/\([^)]*\)/g, " ");
  workingText = workingText.replace(/,.*$/, " ");
  workingText = workingText.replace(/[^\w\s-]/g, " ");
  workingText = workingText.replace(/\s+/g, " ").trim();

  // Basic singularization
  let cleanName = workingText;
  if (cleanName.length > 3) {
    const lower = cleanName.toLowerCase();
    if (lower.endsWith("ies") && !lower.endsWith("berries")) {
      cleanName = cleanName.slice(0, -3) + "y";
    } else if (lower.endsWith("es") && (lower.endsWith("tomatoes") || lower.endsWith("potatoes"))) {
      cleanName = cleanName.slice(0, -2);
    } else if (lower.endsWith("s") && !lower.endsWith("ss") && !lower.endsWith("asparagus") && !lower.endsWith("hummus")) {
      cleanName = cleanName.slice(0, -1);
    }
  }

  // Canonical mapping overrides
  const canonical = getCanonicalMasterName(cleanName);

  return {
    raw: rawString,
    name: cleanName || "Ingredient",
    canonicalName: canonical,
    amount: qtyResult.amount,
    minAmount: qtyResult.minAmount,
    maxAmount: qtyResult.maxAmount,
    unit: qtyResult.unit,
    normalizedUnit: qtyResult.normalizedUnit,
    modifiers: detectedModifiers,
  };
}

/**
 * Standard master ingredient mappings (deduplicating common culinary items).
 */
export function getCanonicalMasterName(name: string): string {
  const lower = name.toLowerCase().trim();

  if (lower.includes("salt") && !lower.includes("epsom")) {
    return "Salt";
  }
  if (lower.includes("olive oil") || lower === "evoo") {
    return "Olive Oil";
  }
  if (lower.includes("black pepper") || lower === "pepper") {
    return "Black Pepper";
  }
  if (lower.includes("garlic")) {
    return "Garlic";
  }
  if (lower.includes("egg") && !lower.includes("eggplant")) {
    return "Eggs";
  }
  if (lower.includes("heavy cream") || lower.includes("whipping cream")) {
    return "Heavy Cream";
  }
  if (lower.includes("all-purpose flour") || lower.includes("all purpose flour") || lower === "flour") {
    return "Flour";
  }
  if (lower.includes("granulated sugar") || lower === "white sugar" || lower === "sugar") {
    return "Sugar";
  }
  if (lower.includes("butter") && !lower.includes("peanut") && !lower.includes("almond")) {
    return "Butter";
  }
  if (lower.includes("onion") && !lower.includes("green onion") && !lower.includes("scallion")) {
    return "Onion";
  }
  if (lower.includes("scallion") || lower.includes("green onion")) {
    return "Green Onions";
  }

  // Title-case
  return name
    .split(" ")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// ============================================================================
// LEVENSHTEIN FUZZY MATCHING (> 0.82 THRESHOLD)
// ============================================================================

/**
 * Computes standard Levenshtein edit distance between strings a and b.
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  const v0 = new Array(s2.length + 1);
  const v1 = new Array(s2.length + 1);

  for (let i = 0; i <= s2.length; i++) {
    v0[i] = i;
  }

  for (let i = 0; i < s1.length; i++) {
    v1[0] = i + 1;

    for (let j = 0; j < s2.length; j++) {
      const cost = s1[i] === s2[j] ? 0 : 1;
      v1[j + 1] = Math.min(
        v1[j] + 1,        // insertion
        v0[j + 1] + 1,    // deletion
        v0[j] + cost      // substitution
      );
    }

    for (let j = 0; j <= s2.length; j++) {
      v0[j] = v1[j];
    }
  }

  return v1[s2.length];
}

/**
 * Calculates normalized similarity ratio between two strings: [0.0, 1.0].
 * 1.0 = identical match, 0.0 = completely disjoint.
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(s1, s2);
  return Number((1 - distance / maxLen).toFixed(4));
}

/**
 * Tests whether two ingredient titles match with confidence > 0.82.
 * Includes token overlap, exact canonical matching, and Levenshtein similarity.
 */
export function fuzzyMatchIngredients(
  ingredientA: string,
  ingredientB: string,
  threshold: number = 0.82
): boolean {
  if (!ingredientA || !ingredientB) return false;

  const normA = normalizeIngredient(ingredientA).canonicalName.toLowerCase();
  const normB = normalizeIngredient(ingredientB).canonicalName.toLowerCase();

  // 1. Direct canonical match
  if (normA === normB) return true;

  // 2. Substring / Token containment: e.g. "Roma Tomato" & "Tomato", "Chicken Breast" & "Chicken"
  if (normA.includes(normB) || normB.includes(normA)) {
    return true;
  }

  // 3. Levenshtein edit distance similarity > threshold (0.82)
  const similarity = levenshteinSimilarity(normA, normB);
  return similarity >= threshold;
}

/**
 * Finds the highest-scoring pantry item match for a given recipe ingredient.
 */
export function findBestPantryMatch(
  ingredient: string,
  pantryItems: PantryItem[],
  threshold: number = 0.82
): { match: PantryItem; similarity: number } | null {
  if (!ingredient || !pantryItems || pantryItems.length === 0) {
    return null;
  }

  const normIng = normalizeIngredient(ingredient).canonicalName.toLowerCase();
  let bestMatch: PantryItem | null = null;
  let highestSim = 0;

  for (const item of pantryItems) {
    const itemName = (item.item_name || item.name || "").toLowerCase();
    const normPantry = normalizeIngredient(itemName).canonicalName.toLowerCase();

    // Exact match
    if (normIng === normPantry) {
      return { match: item, similarity: 1.0 };
    }

    // Token containment
    if (normIng.includes(normPantry) || normPantry.includes(normIng)) {
      const containmentScore = Math.min(normIng.length, normPantry.length) / Math.max(normIng.length, normPantry.length);
      const score = Math.max(0.85, containmentScore);
      if (score > highestSim) {
        highestSim = score;
        bestMatch = item;
      }
      continue;
    }

    // Levenshtein similarity
    const sim = levenshteinSimilarity(normIng, normPantry);
    if (sim >= threshold && sim > highestSim) {
      highestSim = sim;
      bestMatch = item;
    }
  }

  if (bestMatch && highestSim >= threshold) {
    return { match: bestMatch, similarity: highestSim };
  }

  return null;
}

/**
 * Calculates recipe ingredient coverage against current pantry inventory.
 * Useful for scoring which recipes should be recommended first in the meal planner.
 */
export function calculateRecipePantryCoverage(
  recipe: Recipe,
  pantryItems: PantryItem[]
): {
  matchingCount: number;
  totalIngredients: number;
  coverageRatio: number;
  matchedItems: Array<{ ingredient: string; pantryItem: PantryItem; similarity: number }>;
  missingIngredients: string[];
  usesExpiringIngredients: boolean;
} {
  const ingredients = recipe.ingredients || [];
  const totalIngredients = ingredients.length;

  if (totalIngredients === 0) {
    return {
      matchingCount: 0,
      totalIngredients: 0,
      coverageRatio: 0,
      matchedItems: [],
      missingIngredients: [],
      usesExpiringIngredients: false,
    };
  }

  const matchedItems: Array<{ ingredient: string; pantryItem: PantryItem; similarity: number }> = [];
  const missingIngredients: string[] = [];
  let usesExpiringIngredients = false;

  for (const ing of ingredients) {
    const ingName = typeof ing === "string" ? ing : ing.name;
    const matchResult = findBestPantryMatch(ingName, pantryItems, 0.82);

    if (matchResult) {
      matchedItems.push({
        ingredient: ingName,
        pantryItem: matchResult.match,
        similarity: matchResult.similarity,
      });

      // Check if pantry item is expiring soon
      if (
        matchResult.match.freshness_warning ||
        matchResult.match.is_nearing_use_by ||
        (matchResult.match.days_until_use_by !== undefined && matchResult.match.days_until_use_by <= 4)
      ) {
        usesExpiringIngredients = true;
      }
    } else {
      missingIngredients.push(ingName);
    }
  }

  const matchingCount = matchedItems.length;
  const coverageRatio = Number((matchingCount / totalIngredients).toFixed(2));

  return {
    matchingCount,
    totalIngredients,
    coverageRatio,
    matchedItems,
    missingIngredients,
    usesExpiringIngredients,
  };
}
