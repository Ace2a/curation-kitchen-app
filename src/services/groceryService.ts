/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Recipe, RecipeIngredient, PantryItem, MealPlan, GroceryItem } from "../types";
import { recipeClient } from "../api/recipeClient";
import {
  normalizeIngredient,
  parseFractionOrDecimal,
  findBestPantryMatch,
  levenshteinSimilarity,
  fuzzyMatchIngredients,
} from "../utils/ingredientNormalizer";

// ============================================================================
// TYPES & DATA STRUCTURES FOR DEFICIT GAP ENGINE
// ============================================================================

export interface ScheduledMealRef {
  day: string; // e.g. "monday", "tuesday"
  dayLabel: string; // e.g. "Monday"
  slot: "breakfast" | "lunch" | "dinner";
  mealName: string;
  recipe?: Recipe;
  isCustom: boolean;
}

export interface DeficitGapItem {
  id: string;
  name: string; // Canonical clean title (e.g. "Roma Tomatoes" or "Olive Oil")
  canonicalName: string; // Normalized lookup key (e.g. "roma tomato")
  category: string; // "Produce" | "Dairy & Eggs" | "Proteins" | "Pantry Staples" | "Grains & Baking" | "Spices & Oils" | "Other"
  unit: string; // Standard unit ("units", "cup", "tbsp", "lbs", "oz", "g", etc.)
  requiredAmount: number; // Sum of amounts required across scheduled meals
  pantryAmount: number; // Available inventory in pantry (0 if missing or out of stock per Gap C)
  deficitAmount: number; // true deficit: Math.max(0, requiredAmount - pantryAmount)
  formattedDeficitQuantity: string; // e.g. "2 units", "1.5 cups", "0.5 lbs"
  formattedRequiredQuantity: string; // e.g. "3 units"
  formattedPantryQuantity: string; // e.g. "1 unit" or "0 units (Depleted)"
  isDeficit: boolean; // true if deficitAmount > 0
  recipeSources: string[]; // List of meal titles requiring this ingredient
  pantryMatch?: PantryItem | null; // Pantry item matched if any
}

export interface DeficitGapAnalysis {
  totalScheduledMeals: number;
  totalIngredientsAnalyzed: number;
  uniqueIngredientsCount: number;
  deficitItemsCount: number;
  coveredItemsCount: number;
  deficitItems: DeficitGapItem[];
  coveredItems: DeficitGapItem[];
}

// ============================================================================
// UNIT CONVERSION & QUANTITY HELPERS
// ============================================================================

/**
 * Volume conversions to tablespoons as a common baseline.
 */
const VOLUME_TO_TBSP: Record<string, number> = {
  tsp: 1 / 3,
  tbsp: 1,
  "fl oz": 2,
  cup: 16,
  pint: 32,
  quart: 64,
  gallon: 256,
  ml: 1 / 14.787,
  liter: 67.628,
};

/**
 * Weight conversions to ounces as a common baseline.
 */
const WEIGHT_TO_OZ: Record<string, number> = {
  oz: 1,
  lbs: 16,
  g: 1 / 28.3495,
  kg: 35.274,
};

/**
 * Converts a quantity from one unit to another if compatible.
 * If units are incompatible (e.g. volume vs weight vs units), returns null.
 */
export function convertUnitQuantity(
  amount: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const f = fromUnit.toLowerCase().trim();
  const t = toUnit.toLowerCase().trim();

  if (f === t) return amount;

  // Discrete unit equivalences
  if (
    (f === "units" || f === "piece" || f === "each" || f === "clove" || f === "head" || f === "bunch") &&
    (t === "units" || t === "piece" || t === "each" || t === "clove" || t === "head" || t === "bunch")
  ) {
    return amount;
  }

  // Volume conversion
  if (VOLUME_TO_TBSP[f] !== undefined && VOLUME_TO_TBSP[t] !== undefined) {
    const tbsp = amount * VOLUME_TO_TBSP[f];
    return tbsp / VOLUME_TO_TBSP[t];
  }

  // Weight conversion
  if (WEIGHT_TO_OZ[f] !== undefined && WEIGHT_TO_OZ[t] !== undefined) {
    const oz = amount * WEIGHT_TO_OZ[f];
    return oz / WEIGHT_TO_OZ[t];
  }

  return null;
}

/**
 * Formats a numeric quantity cleanly with appropriate fractions or rounded decimals.
 */
export function formatQuantityWithUnit(amount: number, unit?: string | null): string {
  const rounded = Math.round(amount * 100) / 100;
  const unitStr = unit && unit !== "units" ? ` ${unit}` : rounded === 1 ? " unit" : " units";

  // Common culinary fractional representations
  const whole = Math.floor(rounded);
  const frac = Math.round((rounded - whole) * 100) / 100;

  let numStr = `${rounded}`;
  if (frac === 0.5) {
    numStr = whole > 0 ? `${whole} ½` : "½";
  } else if (frac === 0.25) {
    numStr = whole > 0 ? `${whole} ¼` : "¼";
  } else if (frac === 0.75) {
    numStr = whole > 0 ? `${whole} ¾` : "¾";
  } else if (frac === 0.33 || frac === 0.34) {
    numStr = whole > 0 ? `${whole} ⅓` : "⅓";
  } else if (frac === 0.66 || frac === 0.67) {
    numStr = whole > 0 ? `${whole} ⅔` : "⅔";
  }

  return `${numStr}${unitStr}`.trim();
}

/**
 * Resolves standard kitchen category for an ingredient.
 */
export function resolveIngredientCategory(name: string, fallbackCategory?: string): string {
  if (
    fallbackCategory &&
    fallbackCategory !== "Other" &&
    fallbackCategory !== "Uncategorized" &&
    fallbackCategory !== "Meal Plan Sync"
  ) {
    return fallbackCategory;
  }

  const s = name.toLowerCase();

  // Produce
  if (
    /\b(apple|banana|berry|berries|strawberry|blueberry|raspberry|blackberry|lemon|lime|orange|avocado|tomato|tomatoes|onion|onions|garlic|shallot|scallion|ginger|potato|potatoes|carrot|carrots|celery|lettuce|spinach|kale|cabbage|broccoli|cauliflower|zucchini|cucumber|pepper|peppers|bell pepper|jalapeno|mushroom|mushrooms|asparagus|cilantro|parsley|basil|rosemary|thyme|mint|dill|chives|herb|herbs|salad|greens|green onion)\b/i.test(s)
  ) {
    return "Produce";
  }

  // Dairy & Eggs
  if (
    /\b(milk|cream|heavy cream|sour cream|yogurt|butter|cheese|cheddar|parmesan|mozzarella|feta|ricotta|egg|eggs|egg yolk|egg white|half and half)\b/i.test(s)
  ) {
    return "Dairy & Eggs";
  }

  // Proteins
  if (
    /\b(chicken|beef|steak|pork|bacon|sausage|turkey|salmon|tuna|shrimp|fish|tofu|tempeh|lamb|meat|ground beef|ground turkey|prosciutto|ham|cod|halibut)\b/i.test(s)
  ) {
    return "Proteins";
  }

  // Grains & Baking
  if (
    /\b(flour|sugar|baking powder|baking soda|yeast|cornstarch|rice|quinoa|pasta|spaghetti|noodles|oats|oatmeal|bread|breadcrumbs|tortilla|tortillas|pita|penne|fettuccine)\b/i.test(s)
  ) {
    return "Grains & Baking";
  }

  // Spices & Oils
  if (
    /\b(salt|black pepper|paprika|cumin|oregano|cinnamon|nutmeg|chili powder|curry powder|coriander|cayenne|turmeric|vanilla|vanilla extract|olive oil|vegetable oil|canola oil|sesame oil|coconut oil|oil|vinegar|balsamic)\b/i.test(s)
  ) {
    return "Spices & Oils";
  }

  // Pantry Staples
  if (
    /\b(broth|stock|chicken broth|beef broth|vegetable broth|canned|beans|black beans|chickpeas|kidney beans|lentils|tomato sauce|tomato paste|crushed tomatoes|diced tomatoes|soy sauce|honey|maple syrup|mustard|mayo|mayonnaise|ketchup|worcestershire|peanut butter|almond butter|jam|jelly|cocoa|chocolate)\b/i.test(s)
  ) {
    return "Pantry Staples";
  }

  return "Pantry Staples";
}

// ============================================================================
// GAP C: COMPLETE LIVE PANTRY INVENTORY PARSER (INCLUDING QUANTITY: 0)
// ============================================================================

/**
 * Extracts numeric quantity and unit from a PantryItem record.
 * Crucially honors Gap C: Does NOT discard items with quantity 0 or status "Out of Stock".
 * Instead, returns 0 available quantity so the deficit engine knows the user is out.
 */
export function extractPantryItemStock(item: PantryItem): {
  availableQuantity: number;
  unit: string;
  isDepleted: boolean;
} {
  // If explicitly marked "Out of Stock", available quantity is strictly 0
  if (item.status === "Out of Stock") {
    return {
      availableQuantity: 0,
      unit: item.unit || "units",
      isDepleted: true,
    };
  }

  let qty = 0;
  let unit = item.unit || "units";

  if (typeof item.quantity === "number") {
    qty = Math.max(0, item.quantity);
  } else if (typeof item.quantity === "string") {
    const rawStr = item.quantity.trim();
    // Try fraction/decimal parsing
    const parsedNum = parseFractionOrDecimal(rawStr);
    if (parsedNum !== null) {
      qty = Math.max(0, parsedNum);
    } else {
      const match = rawStr.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      if (match) {
        qty = parseFloat(match[1]) || 0;
        if (match[2] && !item.unit) {
          unit = match[2].trim();
        }
      }
    }
  }

  return {
    availableQuantity: qty,
    unit: unit || "units",
    isDepleted: qty <= 0,
  };
}

// ============================================================================
// EXTRACT SCHEDULED MEALS FROM MEAL PLAN
// ============================================================================

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

/**
 * Scans the active 7-day meal planner schedule and matches each slot to a Recipe
 * or custom meal assignment.
 */
export function getScheduledMealsFromPlan(
  mealPlan: MealPlan | null | undefined,
  recipes: Recipe[]
): ScheduledMealRef[] {
  if (!mealPlan) return [];

  const results: ScheduledMealRef[] = [];
  const recipeMap = new Map<string, Recipe>();
  recipes.forEach((r) => {
    recipeMap.set(r.id, r);
    recipeMap.set(r.title.toLowerCase().trim(), r);
  });

  DAYS_OF_WEEK.forEach(({ key, label }) => {
    // Check nested schedule representation
    const nestedDay = (mealPlan as any)[key];

    (["breakfast", "lunch", "dinner"] as const).forEach((slot) => {
      let slotValue: string | null | undefined = null;

      if (nestedDay && typeof nestedDay === "object") {
        slotValue = nestedDay[slot];
      }

      // Check flat schema aliases (e.g. mondayBreakfast, monday_breakfast)
      if (!slotValue) {
        const camelKey = `${key}${slot.charAt(0).toUpperCase() + slot.slice(1)}`;
        const snakeKey = `${key}_${slot}`;
        slotValue = (mealPlan as any)[camelKey] || (mealPlan as any)[snakeKey];
      }

      if (slotValue && typeof slotValue === "string" && slotValue.trim()) {
        const trimmed = slotValue.trim();
        // Lookup recipe by ID or title
        const matchedRecipe = recipeMap.get(trimmed) || recipeMap.get(trimmed.toLowerCase());

        results.push({
          day: key,
          dayLabel: label,
          slot,
          mealName: matchedRecipe ? matchedRecipe.title : trimmed,
          recipe: matchedRecipe,
          isCustom: !matchedRecipe,
        });
      }
    });
  });

  return results;
}

// ============================================================================
// CORE GROCERY DEFICIT GAP ENGINE (SAGE GREEN PIPELINE)
// ============================================================================

interface InternalAggregatedIngredient {
  name: string;
  canonicalName: string;
  category: string;
  unit: string;
  totalRequiredAmount: number;
  recipeSources: Set<string>;
}

/**
 * Core Algorithm:
 * 1. Reads all scheduled recipes from the active 7-day meal plan.
 * 2. Normalizes every ingredient with decimal/fraction parsing & canonical labeling.
 * 3. Aggregates multi-recipe ingredient requirements across the week.
 * 4. Checks against the complete live pantry inventory (including quantity: 0 items).
 * 5. Calculates true deficit: Math.max(0, required - pantry).
 * 6. Segregates into Deficit items (deficit > 0) and Covered items.
 */
export function calculateGroceryDeficit(
  scheduledMeals: ScheduledMealRef[],
  pantryItems: PantryItem[]
): DeficitGapAnalysis {
  const aggregatedMap = new Map<string, InternalAggregatedIngredient>();
  let totalIngredientsAnalyzed = 0;

  // 1. Process all scheduled meals and collect required ingredients
  for (const meal of scheduledMeals) {
    if (meal.recipe && meal.recipe.ingredients && meal.recipe.ingredients.length > 0) {
      for (const ing of meal.recipe.ingredients) {
        totalIngredientsAnalyzed++;

        let rawString = "";
        let explicitAmount: number | null = null;
        let explicitUnit: string | null = null;

        if (typeof ing === "string") {
          rawString = ing;
        } else if (typeof ing === "object" && ing !== null) {
          explicitAmount = ing.canonicalAmount ?? ing.minAmount ?? null;
          explicitUnit = ing.unit ?? null;
          rawString = ing.raw || `${explicitAmount || ""} ${explicitUnit || ""} ${ing.name}`.trim();
        }

        // Run through ingredientNormalizer
        const normalized = normalizeIngredient(rawString);
        const canonicalKey = normalized.canonicalName.toLowerCase().trim();

        if (!canonicalKey) continue;

        const amount = explicitAmount ?? normalized.amount ?? 1;
        const unit = explicitUnit ?? normalized.normalizedUnit ?? normalized.unit ?? "units";
        const category = resolveIngredientCategory(normalized.canonicalName);

        // Group by canonical key + unit compatibility
        const groupKey = `${canonicalKey}___${unit.toLowerCase()}`;

        if (aggregatedMap.has(groupKey)) {
          const existing = aggregatedMap.get(groupKey)!;
          existing.totalRequiredAmount += amount;
          existing.recipeSources.add(`${meal.dayLabel} ${meal.slot.toUpperCase()}: ${meal.mealName}`);
        } else {
          aggregatedMap.set(groupKey, {
            name: normalized.name || normalized.canonicalName,
            canonicalName: normalized.canonicalName,
            category,
            unit,
            totalRequiredAmount: amount,
            recipeSources: new Set([`${meal.dayLabel} ${meal.slot.toUpperCase()}: ${meal.mealName}`]),
          });
        }
      }
    } else if (meal.isCustom && meal.mealName) {
      // Custom meal text entered by user (e.g. "Avocado Toast" or "Greek Salad")
      totalIngredientsAnalyzed++;
      const normalized = normalizeIngredient(meal.mealName);
      const canonicalKey = normalized.canonicalName.toLowerCase().trim();
      const groupKey = `${canonicalKey}___units`;

      if (aggregatedMap.has(groupKey)) {
        const existing = aggregatedMap.get(groupKey)!;
        existing.totalRequiredAmount += 1;
        existing.recipeSources.add(`${meal.dayLabel} ${meal.slot.toUpperCase()}: ${meal.mealName}`);
      } else {
        aggregatedMap.set(groupKey, {
          name: meal.mealName,
          canonicalName: normalized.canonicalName,
          category: resolveIngredientCategory(normalized.canonicalName),
          unit: "units",
          totalRequiredAmount: 1,
          recipeSources: new Set([`${meal.dayLabel} ${meal.slot.toUpperCase()}: ${meal.mealName}`]),
        });
      }
    }
  }

  // 2. Track allocated pantry stock so an inventory item isn't double-counted across distinct groups
  const pantryAllocatedMap = new Map<string, number>();

  const deficitItems: DeficitGapItem[] = [];
  const coveredItems: DeficitGapItem[] = [];

  // 3. Evaluate each aggregated requirement against complete live pantry inventory
  for (const [, agg] of aggregatedMap.entries()) {
    // Levenshtein fuzzy match > 0.82 against live pantry
    const bestMatch = findBestPantryMatch(agg.canonicalName, pantryItems, 0.82);

    let pantryStockAmount = 0;
    let matchedPantryItem: PantryItem | null = null;

    if (bestMatch && bestMatch.match) {
      matchedPantryItem = bestMatch.match;
      const { availableQuantity, unit: pUnit } = extractPantryItemStock(matchedPantryItem);

      // Check how much of this pantry item was already consumed by previous ingredient requirements
      const previousAllocated = pantryAllocatedMap.get(matchedPantryItem.id) || 0;
      const remainingPantryStock = Math.max(0, availableQuantity - previousAllocated);

      // Check unit conversion
      const convertedPantryStock = convertUnitQuantity(remainingPantryStock, pUnit, agg.unit);

      if (convertedPantryStock !== null) {
        pantryStockAmount = Math.max(0, convertedPantryStock);
      } else {
        // Direct fallback: if units differ but match is confident, treat 1-to-1 count
        pantryStockAmount = Math.max(0, remainingPantryStock);
      }
    }

    // Calculate true deficit gap
    const deficitAmount = Math.max(0, Math.round((agg.totalRequiredAmount - pantryStockAmount) * 100) / 100);

    // Record how much of this pantry item was allocated
    if (matchedPantryItem && pantryStockAmount > 0) {
      const consumed = Math.min(pantryStockAmount, agg.totalRequiredAmount);
      const prev = pantryAllocatedMap.get(matchedPantryItem.id) || 0;
      pantryAllocatedMap.set(matchedPantryItem.id, prev + consumed);
    }

    // Determine category: prefer matched pantry item's category if valid
    const finalCategory = resolveIngredientCategory(
      agg.name,
      matchedPantryItem ? matchedPantryItem.category : agg.category
    );

    const formattedDeficit = formatQuantityWithUnit(deficitAmount, agg.unit);
    const formattedRequired = formatQuantityWithUnit(agg.totalRequiredAmount, agg.unit);
    const formattedPantry =
      pantryStockAmount > 0
        ? formatQuantityWithUnit(pantryStockAmount, agg.unit)
        : matchedPantryItem
        ? "0 units (Depleted)"
        : "0 in Pantry";

    const itemResult: DeficitGapItem = {
      id: `deficit_${agg.canonicalName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: agg.name,
      canonicalName: agg.canonicalName,
      category: finalCategory,
      unit: agg.unit,
      requiredAmount: agg.totalRequiredAmount,
      pantryAmount: pantryStockAmount,
      deficitAmount,
      formattedDeficitQuantity: formattedDeficit,
      formattedRequiredQuantity: formattedRequired,
      formattedPantryQuantity: formattedPantry,
      isDeficit: deficitAmount > 0,
      recipeSources: Array.from(agg.recipeSources),
      pantryMatch: matchedPantryItem,
    };

    if (deficitAmount > 0) {
      deficitItems.push(itemResult);
    } else {
      coveredItems.push(itemResult);
    }
  }

  // Sort deficit items by category then name for clean shopping aisle display
  deficitItems.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  return {
    totalScheduledMeals: scheduledMeals.length,
    totalIngredientsAnalyzed,
    uniqueIngredientsCount: aggregatedMap.size,
    deficitItemsCount: deficitItems.length,
    coveredItemsCount: coveredItems.length,
    deficitItems,
    coveredItems,
  };
}

/**
 * Convenient wrapper accepting either (mealPlan, recipes, pantryItems)
 * or (scheduledMeals, pantryItems).
 */
export function calculateWeeklyDeficitGap(
  mealPlanOrMeals: MealPlan | ScheduledMealRef[],
  recipesOrPantry: Recipe[] | PantryItem[],
  pantryItemsOptional?: PantryItem[]
): DeficitGapAnalysis {
  if (Array.isArray(mealPlanOrMeals)) {
    return calculateGroceryDeficit(mealPlanOrMeals, recipesOrPantry as PantryItem[]);
  }
  const scheduled = getScheduledMealsFromPlan(mealPlanOrMeals, recipesOrPantry as Recipe[]);
  return calculateGroceryDeficit(scheduled, pantryItemsOptional || []);
}


// ============================================================================
// SYNC PIPELINE: APPEND DEFICIT ITEMS TO LOCAL GROCERY LIST DATABASE
// ============================================================================

/**
 * Persists calculated deficit gap items into the local in-app grocery list database.
 * Prevents redundant duplicates by checking already existing unchecked grocery items.
 * STRICT CONSTRAINT: Does NOT generate or wire any Canadian e-commerce affiliate routing buttons.
 */
export async function syncDeficitToGroceryList(
  deficitItems: DeficitGapItem[]
): Promise<{ addedCount: number; items: GroceryItem[] }> {
  if (!deficitItems || deficitItems.length === 0) {
    return { addedCount: 0, items: [] };
  }

  // Fetch current live grocery list
  const existingGrocery = await recipeClient.grocery.list();
  const createdItems: GroceryItem[] = [];

  for (const item of deficitItems) {
    // Check if item already exists on the active (unchecked) grocery list
    const existingMatch = existingGrocery.find((g) => {
      if (g.checked) return false;
      return (
        g.name.toLowerCase().trim() === item.name.toLowerCase().trim() ||
        fuzzyMatchIngredients(g.name, item.canonicalName, 0.88)
      );
    });

    if (existingMatch) {
      // Item already on list: we update quantity or preserve without spamming duplicates
      continue;
    }

    const created = await recipeClient.grocery.create({
      name: item.name,
      category: item.category,
      quantity: item.formattedDeficitQuantity,
      checked: false,
      price: 0,
      store: "",
    });

    createdItems.push(created);
  }

  return {
    addedCount: createdItems.length,
    items: createdItems,
  };
}
