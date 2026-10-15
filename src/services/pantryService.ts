/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { canonicalizeIngredientName, cleanIngredientTitle } from "../lib/pantryUtils";

// ============================================================================
// LAYER 3: DATABASE SCHEMA & CORE INTERFACES
// ============================================================================

/**
 * Production-ready Pantry collection database interface.
 * Represents a normalized inventory item in the kitchen pantry.
 */
export interface PantryDatabaseRecord {
  id: string;
  item_name: string;                   // Normalized master title per Pantry Shelf Hub rules
  name?: string;                       // Backward compatibility alias for item_name
  category: string;                    // "Produce", "Dairy & Eggs", "Proteins", "Pantry Staples", "Spices & Oils", "Grains & Baking", "Other"
  quantity: number;                    // Numeric quantity amount (e.g., 1, 2, 6)
  unit: string;                        // Standard unit (e.g., "units", "lbs", "oz", "bunch", "kg", "g")
  status: "In Stock" | "Running Low" | "Out of Stock";
  upc_code: string | null;             // 8, 12, 13 or 14-digit GTIN/UPC/EAN barcode or null
  plu_code: string | null;             // 4 or 5-digit Price Look-Up code or null
  is_organic: boolean;                 // Flagged true if 5-digit PLU starts with '9' or tagged organic
  brand: string | null;                // Manufacturer/distributor brand or null
  date_added: string;                  // ISO 8601 creation/registration timestamp
  created_date?: string;               // Backward compatibility alias for date_added
  purchase_date?: string | null;       // Purchase / acquisition date
  use_by_date?: string | null;         // Expiration / Use-by date
  shelf_life_days?: number | null;     // Estimated shelf life in days
  notes?: string | null;
}

/**
 * Unified Search Result payload returned to the UI / controllers.
 */
export interface UnifiedSearchResult {
  item_name: string;                   // Clean canonical item name
  raw_name: string;                    // Raw name from upstream API or input
  category: string;                    // Normalized category
  quantity: number;                    // Default recommended quantity (usually 1)
  unit: string;                        // Measurement unit
  price: number;                       // Estimated retail price in USD
  brand: string | null;                // Brand if detected
  upc_code: string | null;             // Barcode if numeric lookup
  plu_code: string | null;             // PLU if produce code
  is_organic: boolean;                 // Organic indicator
  image_url?: string;                  // Product image if available
  source: 
    | "plu_cache" 
    | "open_food_facts_barcode" 
    | "open_food_facts_search" 
    | "generic_ingredient_fallback"
    | "local_fallback";
  confidence: number;                  // 0.0 to 1.0 confidence score
}

/**
 * Core Pantry Rule: Items with 0 units or "Out of Stock" are hidden by default
 * so shelves aren't cluttered.
 */
export function isPantryItemVisible(item: { quantity?: number | string; status?: string } | null | undefined): boolean {
  if (!item) return false;
  if (item.status === "Out of Stock") return false;
  
  let qtyNum = 0;
  if (typeof item.quantity === "number") {
    qtyNum = item.quantity;
  } else if (typeof item.quantity === "string") {
    const match = item.quantity.match(/-?\d+(\.\d+)?/);
    if (match) qtyNum = parseFloat(match[0]);
  }
  
  return qtyNum > 0;
}

// ============================================================================
// LAYER 1: LOCAL PLU CACHE (PRICE LOOK-UP CODES)
// ============================================================================

interface PLUDefinition {
  name: string;
  category: string;
  unit: string;
  estimatedPrice: number;
}

/**
 * Standard International Federation for Produce Standards (IFPS) PLU Dictionary.
 * 4-digit codes = Conventional produce.
 * 5-digit codes starting with '9' = Organic produce.
 */
const PLU_DICTIONARY: Record<string, PLUDefinition> = {
  // Bananas & Tropical
  "4011": { name: "Bananas", category: "Produce", unit: "lbs", estimatedPrice: 0.69 },
  "4235": { name: "Plantains", category: "Produce", unit: "lbs", estimatedPrice: 0.99 },
  "4030": { name: "Kiwi Fruit", category: "Produce", unit: "units", estimatedPrice: 0.79 },
  "4042": { name: "Cantaloupe", category: "Produce", unit: "units", estimatedPrice: 2.99 },
  "4032": { name: "Watermelon", category: "Produce", unit: "units", estimatedPrice: 5.99 },

  // Alliums & Roots
  "4068": { name: "Green Onions", category: "Produce", unit: "bunch", estimatedPrice: 0.99 },
  "4082": { name: "Red Onions", category: "Produce", unit: "lbs", estimatedPrice: 1.49 },
  "4093": { name: "Yellow Onions", category: "Produce", unit: "lbs", estimatedPrice: 1.19 },
  "4608": { name: "Garlic", category: "Produce", unit: "units", estimatedPrice: 0.79 },
  "4612": { name: "Ginger Root", category: "Produce", unit: "lbs", estimatedPrice: 2.99 },
  "4072": { name: "Russet Potatoes", category: "Produce", unit: "lbs", estimatedPrice: 0.99 },
  "4562": { name: "Carrots", category: "Produce", unit: "bunch", estimatedPrice: 1.49 },

  // Peppers & Cucurbits
  "4065": { name: "Green Bell Pepper", category: "Produce", unit: "units", estimatedPrice: 1.19 },
  "4688": { name: "Red Bell Pepper", category: "Produce", unit: "units", estimatedPrice: 1.69 },
  "4062": { name: "Cucumber", category: "Produce", unit: "units", estimatedPrice: 0.89 },
  "4048": { name: "Limes", category: "Produce", unit: "units", estimatedPrice: 0.49 },
  "4053": { name: "Lemons", category: "Produce", unit: "units", estimatedPrice: 0.69 },

  // Tomatoes
  "4087": { name: "Roma Tomatoes", category: "Produce", unit: "lbs", estimatedPrice: 1.49 },
  "4664": { name: "Vine Tomatoes", category: "Produce", unit: "lbs", estimatedPrice: 2.49 },
  "4799": { name: "Heirloom Tomatoes", category: "Produce", unit: "lbs", estimatedPrice: 3.99 },

  // Greens & Brassicas
  "4060": { name: "Broccoli", category: "Produce", unit: "lbs", estimatedPrice: 1.89 },
  "4567": { name: "Broccolini", category: "Produce", unit: "bunch", estimatedPrice: 2.99 },
  "4069": { name: "Green Cabbage", category: "Produce", unit: "lbs", estimatedPrice: 0.89 },
  "4070": { name: "Celery", category: "Produce", unit: "bunch", estimatedPrice: 1.79 },
  "4076": { name: "Romaine Lettuce", category: "Produce", unit: "units", estimatedPrice: 1.99 },
  "4078": { name: "Spinach", category: "Produce", unit: "bunch", estimatedPrice: 1.99 },
  "4080": { name: "Asparagus", category: "Produce", unit: "lbs", estimatedPrice: 3.49 },
  "4545": { name: "Bok Choy", category: "Produce", unit: "lbs", estimatedPrice: 1.89 },
  "4554": { name: "Red Chard", category: "Produce", unit: "bunch", estimatedPrice: 2.29 },

  // Avocados & Apples
  "4046": { name: "Hass Avocados", category: "Produce", unit: "units", estimatedPrice: 1.29 },
  "4225": { name: "Large Hass Avocados", category: "Produce", unit: "units", estimatedPrice: 1.99 },
  "4131": { name: "Fuji Apples", category: "Produce", unit: "lbs", estimatedPrice: 1.99 },
  "4133": { name: "Gala Apples", category: "Produce", unit: "lbs", estimatedPrice: 1.89 },
  "4173": { name: "Honeycrisp Apples", category: "Produce", unit: "lbs", estimatedPrice: 2.99 },
  "3107": { name: "Navel Oranges", category: "Produce", unit: "lbs", estimatedPrice: 1.49 },

  // Fungi
  "4077": { name: "White Mushrooms", category: "Produce", unit: "units", estimatedPrice: 2.19 },
  "4650": { name: "Portobello Mushrooms", category: "Produce", unit: "units", estimatedPrice: 3.49 },

  // Herbs
  "4889": { name: "Cilantro", category: "Produce", unit: "bunch", estimatedPrice: 0.89 },
  "4899": { name: "Parsley", category: "Produce", unit: "bunch", estimatedPrice: 0.99 },
  "4885": { name: "Fresh Basil", category: "Produce", unit: "bunch", estimatedPrice: 2.49 },
  "4929": { name: "Fresh Thyme", category: "Produce", unit: "bunch", estimatedPrice: 2.49 },
  "4901": { name: "Fresh Mint", category: "Produce", unit: "bunch", estimatedPrice: 2.19 }
};

/**
 * Checks a 4 or 5-digit PLU code against the local produce cache.
 * If 5-digits and begins with '9', it is flagged as organic.
 */
export function lookupPLU(rawCode: string): UnifiedSearchResult | null {
  const code = rawCode.trim();
  if (!/^(9)?\d{4}$/.test(code)) {
    return null;
  }

  const isOrganic = code.length === 5 && code.startsWith("9");
  const baseCode = isOrganic ? code.substring(1) : code;

  const def = PLU_DICTIONARY[baseCode];
  if (!def) {
    return null;
  }

  const cleanTitle = isOrganic ? `Organic ${def.name}` : def.name;
  const standardized = standardizePantryItemName(cleanTitle);

  return {
    item_name: standardized,
    raw_name: cleanTitle,
    category: def.category,
    quantity: 1,
    unit: def.unit,
    price: isOrganic ? Number((def.estimatedPrice * 1.35).toFixed(2)) : def.estimatedPrice,
    brand: null,
    upc_code: null,
    plu_code: code,
    is_organic: isOrganic,
    source: "plu_cache",
    confidence: 0.98,
  };
}

// ============================================================================
// LAYER 1: NETWORK & API SERVICE LAYER (OPEN FOOD FACTS & FALLBACKS)
// ============================================================================

const OFF_API_TIMEOUT_MS = 5000;
const USER_AGENT = "CurationKitchen-PantryScanner/2.0 (web-applet; barry0568@gmail.com)";

/**
 * Fetches product metadata from Open Food Facts API v2 via numeric barcode.
 * GET https://world.openfoodfacts.org/api/v2/product/[BARCODE].json
 */
export async function lookupBarcodeOpenFoodFacts(barcode: string): Promise<UnifiedSearchResult | null> {
  const cleanBarcode = barcode.trim().replace(/\D/g, "");
  if (!cleanBarcode || cleanBarcode.length < 8) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OFF_API_TIMEOUT_MS);

  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.status !== 1 || !data.product) {
      return null;
    }

    const p = data.product;
    const rawTitle = p.product_name_en || p.product_name || p.generic_name || "Food Item";
    const brand = p.brands ? p.brands.split(",")[0].trim() : null;
    const isOrganic = /organic|bio|ab/i.test(`${p.labels_tags?.join(" ")} ${rawTitle}`);
    const standardized = standardizePantryItemName(rawTitle, brand);
    const category = mapOpenFoodFactsCategory(p.categories_tags || [], p.categories || "", standardized);

    return {
      item_name: standardized,
      raw_name: rawTitle,
      category,
      quantity: 1,
      unit: "units",
      price: 3.99,
      brand: brand || null,
      upc_code: cleanBarcode,
      plu_code: null,
      is_organic: isOrganic,
      image_url: p.image_front_small_url || p.image_url,
      source: "open_food_facts_barcode",
      confidence: 0.95,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`Open Food Facts barcode lookup failed for ${cleanBarcode}:`, err?.message || err);
    return null;
  }
}

/**
 * Searches Open Food Facts by text query.
 * GET https://world.openfoodfacts.org/cgi/search.pl?search_terms=[QUERY]&json=true
 */
export async function searchOpenFoodFacts(query: string): Promise<UnifiedSearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OFF_API_TIMEOUT_MS);

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(cleanQuery)}&search_simple=1&action=process&json=true&page_size=5`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const data = await response.json();
    const products: any[] = Array.isArray(data.products) ? data.products : [];

    if (products.length === 0) {
      return [];
    }

    return products
      .filter((p) => p && (p.product_name || p.product_name_en))
      .map((p) => {
        const rawTitle = p.product_name_en || p.product_name || p.generic_name || cleanQuery;
        const brand = p.brands ? p.brands.split(",")[0].trim() : null;
        const isOrganic = /organic|bio/i.test(`${p.labels_tags?.join(" ")} ${rawTitle}`);
        const standardized = standardizePantryItemName(rawTitle, brand);
        const category = mapOpenFoodFactsCategory(p.categories_tags || [], p.categories || "", standardized);

        return {
          item_name: standardized,
          raw_name: rawTitle,
          category,
          quantity: 1,
          unit: "units",
          price: 3.49,
          brand: brand || null,
          upc_code: p.code || null,
          plu_code: null,
          is_organic: isOrganic,
          image_url: p.image_front_small_url || p.image_url,
          source: "open_food_facts_search" as const,
          confidence: 0.88,
        };
      });
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`Open Food Facts text search failed for "${cleanQuery}":`, err?.message || err);
    return [];
  }
}

/**
 * FALLBACK TIER: Generic Ingredient Parser (Simulating Edamam / Spoonacular).
 * Triggered when text search yields 0 branded results or when offline.
 */
export function parseGenericIngredientFallback(query: string): UnifiedSearchResult {
  const clean = cleanIngredientTitle(query) || query.trim();
  const standardized = standardizePantryItemName(clean);

  // Infer Category
  const lower = clean.toLowerCase();
  let category = "Pantry Staples";
  let unit = "units";
  let estimatedPrice = 2.99;

  if (
    lower.includes("milk") ||
    lower.includes("cheese") ||
    lower.includes("cream") ||
    lower.includes("butter") ||
    lower.includes("yogurt") ||
    lower.includes("egg")
  ) {
    category = "Dairy & Eggs";
    unit = lower.includes("milk") ? "gallon" : lower.includes("egg") ? "units" : "oz";
    estimatedPrice = 3.99;
  } else if (
    lower.includes("chicken") ||
    lower.includes("beef") ||
    lower.includes("pork") ||
    lower.includes("salmon") ||
    lower.includes("fish") ||
    lower.includes("shrimp") ||
    lower.includes("turkey") ||
    lower.includes("tofu")
  ) {
    category = "Proteins";
    unit = "lbs";
    estimatedPrice = 7.99;
  } else if (
    lower.includes("apple") ||
    lower.includes("banana") ||
    lower.includes("tomato") ||
    lower.includes("onion") ||
    lower.includes("garlic") ||
    lower.includes("potato") ||
    lower.includes("lettuce") ||
    lower.includes("spinach") ||
    lower.includes("pepper") && !lower.includes("black pepper") ||
    lower.includes("lemon") ||
    lower.includes("lime") ||
    lower.includes("herb") ||
    lower.includes("chive")
  ) {
    category = "Produce";
    unit = lower.includes("onion") || lower.includes("apple") || lower.includes("garlic") ? "units" : "lbs";
    estimatedPrice = 1.99;
  } else if (
    lower.includes("oil") ||
    lower.includes("salt") ||
    lower.includes("black pepper") ||
    lower.includes("spice") ||
    lower.includes("vinegar") ||
    lower.includes("cinnamon") ||
    lower.includes("curry")
  ) {
    category = "Spices & Oils";
    unit = lower.includes("oil") ? "oz" : "units";
    estimatedPrice = 4.49;
  } else if (
    lower.includes("flour") ||
    lower.includes("sugar") ||
    lower.includes("rice") ||
    lower.includes("pasta") ||
    lower.includes("spaghetti") ||
    lower.includes("oat") ||
    lower.includes("bread")
  ) {
    category = "Grains & Baking";
    unit = lower.includes("bread") ? "loaf" : "lbs";
    estimatedPrice = 2.49;
  }

  const isOrganic = /\borganic\b/i.test(query);

  return {
    item_name: standardized,
    raw_name: query.trim(),
    category,
    quantity: 1,
    unit,
    price: estimatedPrice,
    brand: null,
    upc_code: null,
    plu_code: null,
    is_organic: isOrganic,
    source: "generic_ingredient_fallback",
    confidence: 0.75,
  };
}

// ============================================================================
// LAYER 2: STANDARDIZATION & UNIFIED SEARCH CONTROLLER
// ============================================================================

/**
 * Standardizes a product title according to Pantry Shelf Hub clean rules:
 * - Strips package volumes and weights (e.g., "16 oz", "1 lb", "500ml", "1 Gallon").
 * - Strips noisy marketing descriptors ("All Natural", "Non-GMO", "Gluten Free").
 * - Strips brand prefixes when detected.
 * - Standardizes master staples (Eggs, Salt, Olive Oil, Black Pepper, Garlic, Flour, Heavy Cream).
 */
export function standardizePantryItemName(rawName: string, brand?: string | null): string {
  if (!rawName) return "Food Product";
  let s = rawName.trim();

  // 1. Remove brand name if present at the start or end
  if (brand && brand.length > 2) {
    const brandRegex = new RegExp(`^${escapeRegex(brand)}[\\s\\-–:,]+|[\\s\\-–:,]+${escapeRegex(brand)}$`, "i");
    s = s.replace(brandRegex, " ").trim();
  }

  // 2. Strip package volume/weight measurements (e.g. "16 oz", "1 lb", "500g", "1 Gallon", "12 fl oz", "1kg", "4-pack", "1 Dozen")
  s = s.replace(/\b\d+(\.\d+)?\s*(oz|fl\s*oz|lbs?|pounds?|g|kg|ml|l|liters?|litres?|gallons?|gal|quarts?|qt|pints?|pt|pack|pk|ct|count|dozen|loaf|bunch)\b/gi, " ");

  // 3. Strip package numbers in parenthesis or brackets: e.g. "(16 oz)", "[Pack of 2]"
  s = s.replace(/\([^\)]*\)/g, " ");
  s = s.replace(/\[[^\]]*\]/g, " ");

  // 4. Strip marketing buzzwords
  s = s.replace(/\b(all\s*natural|non-gmo|non\s*gmo|gluten\s*free|certified\s*organic|100%\s*pure|premium\s*quality|grade\s*a|cage\s*free|free\s*range|family\s*size|party\s*size)\b/gi, " ");

  // 5. Clean punctuation and excess whitespace
  s = cleanIngredientTitle(s);

  // 6. Canonicalize to core pantry key (e.g., Egg parts -> Eggs, Kosher Salt -> Salt)
  const canonical = canonicalizeIngredientName(s);
  return canonical || s || "Food Product";
}

/**
 * UNIFIED SEARCH CONTROLLER:
 * Dynamically routes incoming input across PLU cache, Open Food Facts barcode API,
 * Open Food Facts text search, and the generic ingredient fallback tier.
 *
 * Routing Rules:
 * 1. 4 or 5 numeric digits:
 *    - Cross-references PLU dictionary (e.g. '4011' -> Bananas, '94068' -> Organic Green Onions).
 *    - If no PLU found, proceeds to barcode lookup.
 * 2. Purely numeric (8, 12, 13, 14 digits):
 *    - Executes Open Food Facts Barcode API lookup.
 * 3. Text or alphanumeric search:
 *    - Executes Open Food Facts Text search.
 *    - If 0 results returned, invokes Generic Ingredient Fallback Tier (Edamam/Spoonacular mock).
 */
export async function unifiedPantrySearch(input: string): Promise<UnifiedSearchResult[]> {
  const cleanInput = input ? input.trim() : "";
  if (!cleanInput) return [];

  // Check 1: 4 or 5-digit PLU Code
  if (/^(9)?\d{4}$/.test(cleanInput)) {
    const pluResult = lookupPLU(cleanInput);
    if (pluResult) {
      return [pluResult];
    }
  }

  // Check 2: Purely numeric barcode (GTIN-8, UPC-A 12, EAN-13, GTIN-14, etc.)
  const isNumericBarcode = /^\d{8,14}$/.test(cleanInput);
  if (isNumericBarcode) {
    const barcodeResult = await lookupBarcodeOpenFoodFacts(cleanInput);
    if (barcodeResult) {
      return [barcodeResult];
    }

    // If barcode not in Open Food Facts, fallback to generic parsing
    const generic = parseGenericIngredientFallback(`Barcode Item ${cleanInput}`);
    generic.upc_code = cleanInput;
    return [generic];
  }

  // Check 3: Text Search via Open Food Facts
  const searchResults = await searchOpenFoodFacts(cleanInput);
  if (searchResults.length > 0) {
    return searchResults;
  }

  // Check 4: Fallback Tier - Generic Ingredient Parser (Simulating Edamam / Spoonacular)
  const fallbackResult = parseGenericIngredientFallback(cleanInput);
  return [fallbackResult];
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

function mapOpenFoodFactsCategory(tags: string[], categoryStr: string, itemName: string): string {
  const haystack = `${tags.join(" ")} ${categoryStr} ${itemName}`.toLowerCase();

  if (haystack.includes("produce") || haystack.includes("fruit") || haystack.includes("vegetable") || haystack.includes("plant-based")) {
    return "Produce";
  }
  if (haystack.includes("dairy") || haystack.includes("milk") || haystack.includes("cheese") || haystack.includes("yogurt") || haystack.includes("egg")) {
    return "Dairy & Eggs";
  }
  if (haystack.includes("meat") || haystack.includes("poultry") || haystack.includes("chicken") || haystack.includes("beef") || haystack.includes("seafood") || haystack.includes("fish")) {
    return "Proteins";
  }
  if (haystack.includes("spice") || haystack.includes("oil") || haystack.includes("sauce") || haystack.includes("condiment") || haystack.includes("vinegar")) {
    return "Spices & Oils";
  }
  if (haystack.includes("cereal") || haystack.includes("grain") || haystack.includes("bakery") || haystack.includes("bread") || haystack.includes("flour") || haystack.includes("pasta")) {
    return "Grains & Baking";
  }
  return "Pantry Staples";
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
