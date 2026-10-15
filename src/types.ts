/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RecipeIngredient {
  raw?: string;
  name: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  canonicalAmount?: number | null;
  unit: string | null;
  isQualitative?: boolean;
  modifiers?: string[];
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  prep_time: string; // e.g., "15 mins"
  cook_time: string; // e.g., "30 mins"
  servings: number;
  ingredients: (string | RecipeIngredient)[];
  instructions: string[];
  tags: string[];
  collection_id?: string;
  meal_heading?: string; // e.g., "breakfast", "lunch", "dinner", "snacks", "desserts", "etc"
  is_favorite?: boolean;
  nutrition?: RecipeNutrition;
  created_date: string; // ISO timestamp
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string; // Hex color code
  recipe_ids: string[]; // List of recipe IDs in this collection
  created_date: string; // ISO timestamp
}

export interface PantryItem {
  id: string;
  item_name?: string;                 // Canonical master ingredient title
  name: string;                       // Primary title (matches item_name)
  category: string;                   // "Produce", "Dairy & Eggs", "Proteins", "Pantry Staples", "Spices & Oils", "Grains & Baking", "Other"
  quantity?: number | string;         // Numeric quantity or formatted display string (e.g., 2, "2 units")
  unit?: string;                      // Unit (e.g. "units", "lbs", "oz", "bunch")
  status: "In Stock" | "Running Low" | "Out of Stock";
  upc_code?: string | null;           // Nullable UPC barcode string
  plu_code?: string | null;           // Nullable 4 or 5-digit PLU code string
  date_added?: string;                // Date added ISO string
  created_date?: string;              // Backward compatibility alias for date_added
  purchase_date?: string | null;      // Purchase / acquisition date (ISO timestamp or YYYY-MM-DD)
  use_by_date?: string | null;        // Expiration / Use-by date (ISO timestamp or YYYY-MM-DD)
  shelf_life_days?: number | null;    // Estimated shelf life duration in days
  is_nearing_use_by?: boolean;        // Date tracking flag: true if within warning window or expired
  freshness_warning?: boolean;        // Date tracking flag: indicates Freshness Warning badge required
  days_until_use_by?: number;         // Days remaining until use-by date (negative if past)
  is_organic?: boolean;
  brand?: string | null;
}

/**
 * Core Pantry Rule: Items with 0 units or marked "Out of Stock" are hidden by default
 * to keep kitchen shelves uncluttered.
 */
export function isPantryItemVisible(item: { quantity?: number | string; status?: string } | null | undefined): boolean {
  if (!item) return false;
  if (item.status === "Out of Stock") return false;
  let qty = 0;
  if (typeof item.quantity === "number") {
    qty = item.quantity;
  } else if (typeof item.quantity === "string") {
    const match = item.quantity.match(/-?\d+(\.\d+)?/);
    if (match) qty = parseFloat(match[0]);
  }
  return qty > 0;
}

export interface MealPlanDay {
  breakfast?: string | null; // recipe_id or custom string
  lunch?: string | null;     // recipe_id or custom string
  dinner?: string | null;    // recipe_id or custom string
}

export interface MealPlanScheduleMap {
  monday?: MealPlanDay;
  tuesday?: MealPlanDay;
  wednesday?: MealPlanDay;
  thursday?: MealPlanDay;
  friday?: MealPlanDay;
  saturday?: MealPlanDay;
  sunday?: MealPlanDay;
  [day: string]: MealPlanDay | undefined;
}

export interface MealPlan {
  id?: string;
  user_id?: string;
  userId?: string;
  updated_at?: string;
  updatedAt?: string;

  // Monday
  mondayBreakfast?: string | null;
  mondayLunch?: string | null;
  mondayDinner?: string | null;
  monday_breakfast?: string | null;
  monday_lunch?: string | null;
  monday_dinner?: string | null;

  // Tuesday
  tuesdayBreakfast?: string | null;
  tuesdayLunch?: string | null;
  tuesdayDinner?: string | null;
  tuesday_breakfast?: string | null;
  tuesday_lunch?: string | null;
  tuesday_dinner?: string | null;

  // Wednesday
  wednesdayBreakfast?: string | null;
  wednesdayLunch?: string | null;
  wednesdayDinner?: string | null;
  wednesday_breakfast?: string | null;
  wednesday_lunch?: string | null;
  wednesday_dinner?: string | null;

  // Thursday
  thursdayBreakfast?: string | null;
  thursdayLunch?: string | null;
  thursdayDinner?: string | null;
  thursday_breakfast?: string | null;
  thursday_lunch?: string | null;
  thursday_dinner?: string | null;

  // Friday
  fridayBreakfast?: string | null;
  fridayLunch?: string | null;
  fridayDinner?: string | null;
  friday_breakfast?: string | null;
  friday_lunch?: string | null;
  friday_dinner?: string | null;

  // Saturday
  saturdayBreakfast?: string | null;
  saturdayLunch?: string | null;
  saturdayDinner?: string | null;
  saturday_breakfast?: string | null;
  saturday_lunch?: string | null;
  saturday_dinner?: string | null;

  // Sunday
  sundayBreakfast?: string | null;
  sundayLunch?: string | null;
  sundayDinner?: string | null;
  sunday_breakfast?: string | null;
  sunday_lunch?: string | null;
  sunday_dinner?: string | null;

  // Day accessors for legacy/helper lookup
  monday?: MealPlanDay;
  tuesday?: MealPlanDay;
  wednesday?: MealPlanDay;
  thursday?: MealPlanDay;
  friday?: MealPlanDay;
  saturday?: MealPlanDay;
  sunday?: MealPlanDay;

  // Optional nested client-side object helper lookup map layout
  schedule?: MealPlanScheduleMap;

  // Dynamic index signatures for days or slot keys
  [key: string]: any;
}

export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: string;
  checked: boolean;
  store: string;
  created_date: string;
}

export interface GrocerySettings {
  defaultStore: string;
  budgetLimit: number;
}

export interface RecipeNutrition {
  calories: number;     // kcal per serving
  protein: number;      // g per serving
  carbs: number;        // g per serving
  fat: number;          // g per serving
  sodium: number;       // mg per serving
}

export interface NutritionGoals {
  useGovernment: boolean;
  country: string; // "US" | "UK" | "CA" | "AU" | "JP" | "EU" | "WHO"
  customCalories: number;
  customProtein: number;
  customCarbs: number;
  customFat: number;
  customSodium: number;
}

export interface NutritionLog {
  id: string;
  name: string;
  recipeId?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium: number;
  servings: number;
  date: string; // YYYY-MM-DD
  created_date: string;
}


