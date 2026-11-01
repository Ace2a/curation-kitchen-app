import { describe, it } from "node:test";
import assert from "node:assert";
import { unifiedPantrySearch } from "../services/pantryService";
import {
  normalizeIngredient,
  fuzzyMatchIngredients,
  findBestPantryMatch,
  levenshteinSimilarity,
  parseFractionOrDecimal,
  extractQuantityAndUnit,
} from "../utils/ingredientNormalizer";
import {
  calculateWeeklyDeficitGap,
  syncDeficitToGroceryList,
  extractPantryItemStock,
} from "../services/groceryService";
import { recipeClient } from "../api/recipeClient";
import { MealPlan, PantryItem, Recipe } from "../types";

describe("Core Pipeline Integration Suite", () => {
  describe("a) Scanner Fallback Strategy", () => {
    it("returns a manual_fallback payload for unknown numeric barcodes", async () => {
      const unknownBarcode = "999999999999";
      const results = await unifiedPantrySearch(unknownBarcode);

      assert.ok(Array.isArray(results), "Expected search results array");
      assert.strictEqual(results.length, 1, "Expected single fallback payload for unknown barcode");

      const item = results[0];
      assert.strictEqual(item.source, "manual_fallback", "Source must strictly be 'manual_fallback'");
      assert.strictEqual(item.is_fallback, true, "is_fallback flag must be true");
      assert.strictEqual(item.upc_code, unknownBarcode, "UPC code must be retained on the payload");
      assert.strictEqual(typeof item.confidence, "number", "Confidence score must be defined");
      assert.ok(item.confidence <= 0.5, "Confidence should reflect unconfirmed fallback tier");
    });

    it("gracefully falls back when searching non-existent produce or query", async () => {
      const nonexistentPluOrCode = "000000000000";
      const results = await unifiedPantrySearch(nonexistentPluOrCode);

      assert.ok(results.length >= 1, "Must return at least one fallback result item");
      const primary = results[0];
      assert.strictEqual(primary.source, "manual_fallback", "Source must be 'manual_fallback'");
      assert.strictEqual(primary.upc_code, nonexistentPluOrCode);
    });
  });

  describe("b) Fuzzy Matching Matrix & Ingredient Normalizer", () => {
    it("matches 'Organic Valley Whole Milk' against '1 cup whole milk' with similarity > 0.82", () => {
      const pantryItemName = "Organic Valley Whole Milk";
      const recipeIngredient = "1 cup whole milk";

      const normPantry = normalizeIngredient(pantryItemName);
      const normRecipe = normalizeIngredient(recipeIngredient);

      assert.ok(normPantry.modifiers.includes("organic"), "Detected modifier 'organic'");
      assert.strictEqual(normRecipe.amount, 1, "Parsed quantity 1");
      assert.strictEqual(normRecipe.normalizedUnit, "cup", "Normalized unit 'cup'");

      const isFuzzyMatched = fuzzyMatchIngredients(pantryItemName, recipeIngredient, 0.82);
      assert.strictEqual(isFuzzyMatched, true, "Fuzzy match must return true above 0.82 threshold");

      const mockPantryItems: PantryItem[] = [
        {
          id: "pantry-milk-1",
          item_name: "Organic Valley Whole Milk",
          name: "Organic Valley Whole Milk",
          category: "Dairy & Eggs",
          quantity: 1,
          unit: "units",
          status: "In Stock",
        },
      ];

      const bestMatch = findBestPantryMatch(recipeIngredient, mockPantryItems, 0.82);
      assert.ok(bestMatch !== null, "Pantry match must not be null");
      assert.strictEqual(bestMatch.match.id, "pantry-milk-1");
      assert.ok(
        bestMatch.similarity >= 0.82,
        `Similarity score (${bestMatch.similarity}) must exceed 0.82 threshold`
      );
    });

    it("parses vulgar unicode fractions, mixed numbers, and decimals accurately", () => {
      assert.strictEqual(parseFractionOrDecimal("½"), 0.5);
      assert.strictEqual(parseFractionOrDecimal("1 ½"), 1.5);
      assert.strictEqual(parseFractionOrDecimal("3/4"), 0.75);
      assert.strictEqual(parseFractionOrDecimal("2-1/2"), 2.5);
      assert.strictEqual(parseFractionOrDecimal("0.25"), 0.25);
    });

    it("extracts culinary units and numeric quantities properly", () => {
      const extracted = extractQuantityAndUnit("2 1/2 lbs boneless skinless chicken thighs");
      assert.strictEqual(extracted.amount, 2.5);
      assert.strictEqual(extracted.normalizedUnit, "lbs");
      assert.ok(extracted.remainingText.includes("chicken thighs"));
    });
  });

  describe("c) Deficit Calculation Integrity", () => {
    it("correctly isolates 3 units deficit when pantry stock is 0 and pushes to grocery create", async () => {
      const testIngredientName = "Roma Tomatoes";

      const mockRecipe: Recipe = {
        id: "recipe-pasta-1",
        title: "Fresh Tomato Basil Pasta",
        description: "Classic pasta with fresh tomatoes",
        prep_time: "20 mins",
        cook_time: "15 mins",
        servings: 4,
        created_date: new Date().toISOString(),
        ingredients: [
          {
            name: testIngredientName,
            canonicalAmount: 3,
            minAmount: 3,
            maxAmount: 3,
            unit: "units",
            raw: "3 units Roma Tomatoes",
          },
        ],
        instructions: ["Chop tomatoes", "Simmer sauce"],
        tags: ["Italian", "Quick"],
      };

      const mockMealPlan: MealPlan = {
        monday: { dinner: mockRecipe.id },
        tuesday: {},
        wednesday: {},
        thursday: {},
        friday: {},
        saturday: {},
        sunday: {},
      };

      const mockPantryDepleted: PantryItem[] = [
        {
          id: "pantry-tomatoes-zero",
          item_name: "Roma Tomatoes",
          name: "Roma Tomatoes",
          category: "Produce",
          quantity: 0,
          unit: "units",
          status: "Out of Stock",
        },
      ];

      const stockStatus = extractPantryItemStock(mockPantryDepleted[0]);
      assert.strictEqual(stockStatus.availableQuantity, 0, "Depleted pantry item must yield 0 available quantity");
      assert.strictEqual(stockStatus.isDepleted, true, "Depleted status must be true");

      const deficitReport = calculateWeeklyDeficitGap(
        mockMealPlan,
        [mockRecipe],
        mockPantryDepleted
      );

      assert.strictEqual(deficitReport.totalScheduledMeals, 1, "Scheduled meal count must be 1");
      assert.strictEqual(deficitReport.deficitItemsCount, 1, "Must find exactly 1 deficit item");

      const deficitItem = deficitReport.deficitItems[0];
      assert.strictEqual(deficitItem.requiredAmount, 3, "Required amount must be 3");
      assert.strictEqual(deficitItem.pantryAmount, 0, "Pantry amount must be 0");
      assert.strictEqual(deficitItem.deficitAmount, 3, "Isolated gap deficit must be strictly 3");
      assert.strictEqual(deficitItem.isDeficit, true, "isDeficit flag must be true");
      assert.strictEqual(deficitItem.formattedDeficitQuantity, "3 units", "Formatted quantity must be '3 units'");

      const originalList = recipeClient.grocery.list;
      const originalCreate = recipeClient.grocery.create;

      const createdItemsPushed: any[] = [];
      recipeClient.grocery.list = async () => [];
      recipeClient.grocery.create = async (itemPayload) => {
        createdItemsPushed.push(itemPayload);
        return {
          id: `gro_mock_${Date.now()}`,
          name: itemPayload.name || "",
          category: itemPayload.category || "Produce",
          quantity: itemPayload.quantity || "1 unit",
          price: 0,
          checked: false,
          store: "",
          created_date: new Date().toISOString(),
        };
      };

      try {
        const syncResult = await syncDeficitToGroceryList(deficitReport.deficitItems);

        assert.strictEqual(syncResult.addedCount, 1, "Must add exactly 1 item to grocery database");
        assert.strictEqual(createdItemsPushed.length, 1, "Must call recipeClient.grocery.create once");

        const pushed = createdItemsPushed[0];
        assert.ok(
          pushed.name.toLowerCase().includes("tomato"),
          `Expected item name to match 'tomato', got: ${pushed.name}`
        );
        assert.strictEqual(
          pushed.quantity,
          "3 units",
          "Pushed item quantity must equal the isolated deficit of '3 units'"
        );
        assert.strictEqual(pushed.checked, false, "Pushed item must be unchecked");
      } finally {
        recipeClient.grocery.list = originalList;
        recipeClient.grocery.create = originalCreate;
      }
    });
  });
});
