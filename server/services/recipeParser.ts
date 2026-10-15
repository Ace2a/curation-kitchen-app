import { GoogleGenAI, Type, Schema } from "@google/genai";

/**
 * Canonical Culinary Unit Dictionary
 * Groups common variations, pluralizations, and abbreviations into single canonical keys.
 */
export const UNIT_MAPPINGS: Record<string, string> = {
  // Volume - tsp
  tsp: "tsp",
  tsps: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  t: "tsp",
  tspn: "tsp",

  // Volume - tbsp
  tbsp: "tbsp",
  tbsps: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tbs: "tbsp",
  tb: "tbsp",
  tblsp: "tbsp",
  tbl: "tbsp",
  tbsn: "tbsp",

  // Volume - cup
  cup: "cup",
  cups: "cup",
  c: "cup",

  // Volume - ml
  ml: "ml",
  mls: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",

  // Volume - l
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",

  // Volume - fl_oz
  "fl oz": "fl_oz",
  "fl_oz": "fl_oz",
  "floz": "fl_oz",
  "fluid oz": "fl_oz",
  "fluid ounce": "fl_oz",
  "fluid ounces": "fl_oz",

  // Volume - pint
  pint: "pint",
  pints: "pint",
  pt: "pint",
  pts: "pint",

  // Volume - quart
  quart: "quart",
  quarts: "quart",
  qt: "quart",
  qts: "quart",

  // Volume - gallon
  gallon: "gallon",
  gallons: "gallon",
  gal: "gallon",
  gals: "gallon",

  // Weight - g
  g: "g",
  gram: "g",
  grams: "g",
  gm: "g",
  gms: "g",

  // Weight - kg
  kg: "kg",
  kgs: "kg",
  kilogram: "kg",
  kilograms: "kg",
  kilo: "kg",
  kilos: "kg",

  // Weight - oz
  oz: "oz",
  ozs: "oz",
  ounce: "oz",
  ounces: "oz",

  // Weight - lb
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",

  // Qualitative/Count - pinch
  pinch: "pinch",
  pinches: "pinch",

  // Qualitative/Count - dash
  dash: "dash",
  dashes: "dash",

  // Qualitative/Count - piece
  piece: "piece",
  pieces: "piece",
  pc: "piece",
  pcs: "piece",

  // Qualitative/Count - slice
  slice: "slice",
  slices: "slice",

  // Qualitative/Count - can
  can: "can",
  cans: "can",

  // Qualitative/Count - clove
  clove: "clove",
  cloves: "clove",

  // Qualitative/Count - head
  head: "head",
  heads: "head",
};

/**
 * Normalizes culinary measurement strings to their canonical counterpart.
 * Trims, strips punctuation (like periods and commas), downcases, and checks against the canonical dictionary.
 * Fallbacks safely to the cleaned lowercase string if unrecognized.
 */
export function normalizeIngredientUnit(unit: string | null | undefined): string | null {
  if (!unit) return null;

  // Trim, strip punctuation, collapse whitespace, and convert to lowercase
  const sanitized = unit
    .trim()
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) return null;

  // 1. Direct dictionary match
  if (UNIT_MAPPINGS[sanitized]) {
    return UNIT_MAPPINGS[sanitized];
  }

  // 2. Match underscored multi-word units (e.g. "fl oz" -> "fl_oz")
  const underscored = sanitized.replace(/\s+/g, "_");
  if (UNIT_MAPPINGS[underscored]) {
    return UNIT_MAPPINGS[underscored];
  }

  // 3. Fallback safely to lowercase sanitized string
  return sanitized;
}

export interface Ingredient {
  raw: string;
  name: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  canonicalAmount?: number | null;
  unit: string | null;
  isQualitative: boolean;
  modifiers?: string[];
}

export interface InstructionStep {
  stepNumber: number;
  instructionText: string;
  timerMinutes?: number | null;
}

export interface ParsedRecipe {
  title: string;
  description?: string | null;
  servings?: number | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  ingredients: Ingredient[];
  instructions: InstructionStep[];
}

// Gemini Structured Output Schema
const recipeExtractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING, nullable: true },
    servings: { type: Type.NUMBER, nullable: true },
    prepTimeMinutes: { type: Type.NUMBER, nullable: true },
    cookTimeMinutes: { type: Type.NUMBER, nullable: true },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          raw: { type: Type.STRING, description: "Original unparsed line" },
          name: { type: Type.STRING, description: "Standardized singular base ingredient name" },
          minAmount: { type: Type.NUMBER, nullable: true },
          maxAmount: { type: Type.NUMBER, nullable: true },
          canonicalAmount: { type: Type.NUMBER, nullable: true, description: "Decimal float value (e.g., 0.5 for 1/2)" },
          unit: { type: Type.STRING, nullable: true, description: "Measurement unit if present" },
          isQualitative: { type: Type.BOOLEAN, description: "True if amount is 'to taste', 'pinch', etc." },
          modifiers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Processing states like 'chopped', 'sifted', 'melted'"
          },
          category: {
            type: Type.STRING,
            description: "Kitchen category matching UI filters: 'Produce', 'Dairy & Eggs', 'Proteins', 'Pantry Staples', 'Grains & Baking', 'Spices & Oils', or 'Other'",
            enum: [
              "Produce",
              "Dairy & Eggs",
              "Proteins",
              "Pantry Staples",
              "Grains & Baking",
              "Spices & Oils",
              "Other"
            ]
          }
        },
        required: ["raw", "name", "isQualitative"]
      }
    },
    instructions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepNumber: { type: Type.INTEGER },
          instructionText: { type: Type.STRING },
          timerMinutes: { type: Type.NUMBER, nullable: true }
        },
        required: ["stepNumber", "instructionText"]
      }
    }
  },
  required: ["title", "ingredients", "instructions"]
};

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * Extracts and parses raw recipe text with Gemini Flash and post-processes
 * all ingredient units to canonical standardized values.
 */
export async function parseRecipeWithGemini(rawText: string): Promise<ParsedRecipe> {
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: `Parse this raw recipe text into clean structured data:\n\n${rawText}`,
    config: {
      temperature: 0.0,
      responseMimeType: "application/json",
      responseSchema: recipeExtractionSchema,
      systemInstruction: `You are an expert culinary data architect. Convert recipe text into precise, structured data.
STRICT TEXT FILTERING & INGREDIENT RULES:
1. Physical Food Nouns Only: The "name" field must contain only the direct, physical name of the food item (e.g., "heavy cream", "cheddar cheese", "flour").
2. Discard Action Text & Fragments: Explicitly forbid extracting cooking instructions, prepositions, verb phrases, preparation state descriptions, or broken sentence fragments as ingredient names (e.g., "Chilled and whipped", "And layer generously on..."). If a line does not specify a tangible ingredient, discard it entirely.
3. Strict Isolation: Ensure actions like "whipped", "chilled", "sifted", or "layered" are strictly filtered out of the core identity name. They must either go into the "modifiers" array or be omitted completely.
4. Convert all fraction quantities into floats (e.g. 1/2 -> 0.5, 1 1/4 -> 1.25).
5. Set isQualitative: true for items like 'pinch of salt' or 'black pepper to taste' where exact measurements are not provided.`
    }
  });

  const responseText = response.text?.trim();
  if (!responseText) {
    throw new Error("Gemini returned an empty response");
  }

  const parsed: ParsedRecipe = JSON.parse(responseText);

  if (!parsed || !Array.isArray(parsed.ingredients)) {
    throw new Error("Invalid recipe payload: parsed.ingredients is missing or malformed");
  }

  // Post-processing: normalize all ingredient units deterministically
  for (const ingredient of parsed.ingredients) {
    ingredient.unit = normalizeIngredientUnit(ingredient.unit);
  }

  return parsed;
}
