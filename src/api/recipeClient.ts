/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Recipe, RecipeIngredient, Collection, PantryItem, MealPlan, GroceryItem, GrocerySettings, NutritionGoals, NutritionLog, RecipeNutrition } from "../types";
import { offlineStore, generateTempId } from "./offlineStore";
import { unifiedPantrySearch, UnifiedSearchResult } from "../services/pantryService";

export const recipeClient = {
  collections: {
    list: async (sortKey?: string): Promise<Collection[]> => {
      if (offlineStore.isOffline()) {
        const cached = offlineStore.getCache<Collection[]>("collections_list") || [];
        const list = [...cached];
        if (sortKey === "-created_date") {
          return list.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
        }
        return list;
      }
      try {
        const res = await fetch("/api/collections");
        if (!res.ok) throw new Error("Failed to fetch collections");
        const list: Collection[] = await res.json();
        offlineStore.setCache("collections_list", list);
        if (sortKey === "-created_date") {
          return [...list].sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
        }
        return list;
      } catch (err) {
        // Fallback to cache on network failure
        console.warn("Fetch collections failed, falling back to cache", err);
        const cached = offlineStore.getCache<Collection[]>("collections_list") || [];
        if (sortKey === "-created_date") {
          return [...cached].sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
        }
        return cached;
      }
    },
    create: async (data: Partial<Collection>): Promise<Collection> => {
      if (offlineStore.isOffline()) {
        const tempId = generateTempId("col");
        const newItem: Collection = {
          id: tempId,
          name: data.name || "Untitled Collection",
          description: data.description,
          color: data.color || "#EF4444",
          recipe_ids: data.recipe_ids || [],
          created_date: new Date().toISOString(),
        };
        offlineStore.enqueueMutation("collections", "create", newItem);
        return newItem;
      }
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create collection");
      const result: Collection = await res.json();
      
      // Keep cache fresh
      const cached = offlineStore.getCache<Collection[]>("collections_list") || [];
      offlineStore.setCache("collections_list", [result, ...cached]);
      return result;
    },
    update: async (id: string, data: Partial<Collection>): Promise<Collection> => {
      if (offlineStore.isOffline()) {
        const cached = offlineStore.getCache<Collection[]>("collections_list") || [];
        const original = cached.find(item => item.id === id);
        const updatedItem: Collection = {
          id,
          name: data.name ?? original?.name ?? "Untitled Collection",
          description: data.description ?? original?.description,
          color: data.color ?? original?.color ?? "#EF4444",
          recipe_ids: data.recipe_ids ?? original?.recipe_ids ?? [],
          created_date: original?.created_date ?? new Date().toISOString(),
        };
        offlineStore.enqueueMutation("collections", "update", data, id);
        return updatedItem;
      }
      const res = await fetch(`/api/collections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update collection");
      const result: Collection = await res.json();

      // Keep cache fresh
      const cached = offlineStore.getCache<Collection[]>("collections_list") || [];
      const updatedList = cached.map(item => item.id === id ? result : item);
      offlineStore.setCache("collections_list", updatedList);
      return result;
    },
    delete: async (id: string): Promise<void> => {
      if (offlineStore.isOffline()) {
        offlineStore.enqueueMutation("collections", "delete", null, id);
        return;
      }
      const res = await fetch(`/api/collections/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete collection");

      // Keep cache fresh
      const cached = offlineStore.getCache<Collection[]>("collections_list") || [];
      offlineStore.setCache("collections_list", cached.filter(item => item.id !== id));
    }
  },
  recipes: {
    list: async (sortKey?: string): Promise<Recipe[]> => {
      if (offlineStore.isOffline()) {
        const cached = offlineStore.getCache<Recipe[]>("recipes_list") || [];
        const list = [...cached];
        if (sortKey === "-created_date") {
          return list.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
        }
        return list;
      }
      try {
        const res = await fetch("/api/recipes");
        if (!res.ok) throw new Error("Failed to fetch recipes");
        const list: Recipe[] = await res.json();
        offlineStore.setCache("recipes_list", list);
        if (sortKey === "-created_date") {
          return [...list].sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
        }
        return list;
      } catch (err) {
        console.warn("Fetch recipes failed, falling back to cache", err);
        const cached = offlineStore.getCache<Recipe[]>("recipes_list") || [];
        if (sortKey === "-created_date") {
          return [...cached].sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
        }
        return cached;
      }
    },
    create: async (data: Partial<Recipe>): Promise<Recipe> => {
      if (offlineStore.isOffline()) {
        const tempId = generateTempId("rec");
        const newItem: Recipe = {
          id: tempId,
          title: data.title || "Untitled Recipe",
          description: data.description || "",
          prep_time: data.prep_time || "10 mins",
          cook_time: data.cook_time || "20 mins",
          servings: data.servings || 2,
          ingredients: data.ingredients || [],
          instructions: data.instructions || [],
          tags: data.tags || [],
          collection_id: data.collection_id,
          meal_heading: data.meal_heading,
          image_url: data.image_url,
          is_favorite: data.is_favorite || false,
          created_date: new Date().toISOString(),
        };
        offlineStore.enqueueMutation("recipes", "create", newItem);
        return newItem;
      }
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create recipe");
      const result: Recipe = await res.json();

      // Keep cache fresh
      const cached = offlineStore.getCache<Recipe[]>("recipes_list") || [];
      offlineStore.setCache("recipes_list", [result, ...cached]);
      return result;
    },
    update: async (id: string, data: Partial<Recipe>): Promise<Recipe> => {
      if (offlineStore.isOffline()) {
        const cached = offlineStore.getCache<Recipe[]>("recipes_list") || [];
        const original = cached.find(item => item.id === id);
        const updatedItem: Recipe = {
          id,
          title: data.title ?? original?.title ?? "Untitled Recipe",
          description: data.description ?? original?.description ?? "",
          prep_time: data.prep_time ?? original?.prep_time ?? "10 mins",
          cook_time: data.cook_time ?? original?.cook_time ?? "20 mins",
          servings: data.servings ?? original?.servings ?? 2,
          ingredients: data.ingredients ?? original?.ingredients ?? [],
          instructions: data.instructions ?? original?.instructions ?? [],
          tags: data.tags ?? original?.tags ?? [],
          collection_id: data.collection_id ?? original?.collection_id,
          meal_heading: data.meal_heading ?? original?.meal_heading,
          image_url: data.image_url ?? original?.image_url,
          is_favorite: data.is_favorite !== undefined ? data.is_favorite : original?.is_favorite,
          created_date: original?.created_date ?? new Date().toISOString(),
        };
        offlineStore.enqueueMutation("recipes", "update", data, id);
        return updatedItem;
      }
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update recipe");
      const result: Recipe = await res.json();

      // Keep cache fresh
      const cached = offlineStore.getCache<Recipe[]>("recipes_list") || [];
      const updatedList = cached.map(item => item.id === id ? result : item);
      offlineStore.setCache("recipes_list", updatedList);
      return result;
    },
    delete: async (id: string): Promise<void> => {
      if (offlineStore.isOffline()) {
        offlineStore.enqueueMutation("recipes", "delete", null, id);
        return;
      }
      const res = await fetch(`/api/recipes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete recipe");

      // Keep cache fresh
      const cached = offlineStore.getCache<Recipe[]>("recipes_list") || [];
      offlineStore.setCache("recipes_list", cached.filter(item => item.id !== id));
    }
  },
  pantry: {
    list: async (): Promise<PantryItem[]> => {
      if (offlineStore.isOffline()) {
        return offlineStore.getCache<PantryItem[]>("pantry_list") || [];
      }
      try {
        const res = await fetch("/api/pantry");
        if (!res.ok) throw new Error("Failed to fetch pantry items");
        const list: PantryItem[] = await res.json();
        offlineStore.setCache("pantry_list", list);
        return list;
      } catch (err) {
        console.warn("Fetch pantry failed, falling back to cache", err);
        return offlineStore.getCache<PantryItem[]>("pantry_list") || [];
      }
    },
    create: async (data: Partial<PantryItem>): Promise<PantryItem> => {
      if (offlineStore.isOffline()) {
        const tempId = generateTempId("pan");
        const newItem: PantryItem = {
          id: tempId,
          name: data.name || "Pantry Item",
          category: data.category || "Other",
          quantity: data.quantity,
          status: data.status || "In Stock",
          created_date: new Date().toISOString(),
        };
        offlineStore.enqueueMutation("pantry", "create", newItem);
        return newItem;
      }
      const isPremium = typeof window !== "undefined" && localStorage.getItem("kitchen_is_premium") === "true";
      const res = await fetch("/api/pantry", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-subscription": isPremium ? "premium" : "free",
          "x-subscription-tier": isPremium ? "premium" : "free",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || "Failed to create pantry item");
      }
      const result: PantryItem = await res.json();

      // Keep cache fresh
      const cached = offlineStore.getCache<PantryItem[]>("pantry_list") || [];
      offlineStore.setCache("pantry_list", [result, ...cached]);
      return result;
    },
    update: async (id: string, data: Partial<PantryItem>): Promise<PantryItem> => {
      if (offlineStore.isOffline()) {
        const cached = offlineStore.getCache<PantryItem[]>("pantry_list") || [];
        const original = cached.find(item => item.id === id);
        const updatedItem: PantryItem = {
          id,
          name: data.name ?? original?.name ?? "Pantry Item",
          category: data.category ?? original?.category ?? "Other",
          quantity: data.quantity ?? original?.quantity,
          status: data.status ?? original?.status ?? "In Stock",
          created_date: original?.created_date ?? new Date().toISOString(),
        };
        offlineStore.enqueueMutation("pantry", "update", data, id);
        return updatedItem;
      }
      const res = await fetch(`/api/pantry/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update pantry item");
      const result: PantryItem = await res.json();

      // Keep cache fresh
      const cached = offlineStore.getCache<PantryItem[]>("pantry_list") || [];
      const updatedList = cached.map(item => item.id === id ? result : item);
      offlineStore.setCache("pantry_list", updatedList);
      return result;
    },
    delete: async (id: string): Promise<void> => {
      if (offlineStore.isOffline()) {
        offlineStore.enqueueMutation("pantry", "delete", null, id);
        return;
      }
      const res = await fetch(`/api/pantry/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete pantry item");

      // Keep cache fresh
      const cached = offlineStore.getCache<PantryItem[]>("pantry_list") || [];
      offlineStore.setCache("pantry_list", cached.filter(item => item.id !== id));
    },
    unifiedSearch: async (input: string): Promise<UnifiedSearchResult[]> => {
      try {
        const results = await unifiedPantrySearch(input);
        if (results && results.length > 0) return results;
      } catch (err) {
        console.warn("Client-side unified search fallback to backend", err);
      }
      try {
        const res = await fetch(`/api/pantry/search?q=${encodeURIComponent(input)}`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn("Backend search fetch failed", e);
      }
      return [
        {
          item_name: input.trim(),
          raw_name: input.trim(),
          category: "Pantry Staples",
          quantity: 1,
          unit: "units",
          price: 2.99,
          brand: null,
          upc_code: /^\d+$/.test(input) ? input : null,
          plu_code: /^(9)?\d{4}$/.test(input) ? input : null,
          is_organic: false,
          source: "generic_ingredient_fallback",
          confidence: 0.7
        }
      ];
    }
  },
  mealPlan: {
    get: async (): Promise<MealPlan> => {
      if (offlineStore.isOffline()) {
        return offlineStore.getCache<MealPlan>("mealplan") || {};
      }
      try {
        const res = await fetch("/api/mealplan");
        if (!res.ok) throw new Error("Failed to fetch meal plan");
        const data: MealPlan = await res.json();
        offlineStore.setCache("mealplan", data);
        return data;
      } catch (err) {
        console.warn("Fetch mealplan failed, falling back to cache", err);
        return offlineStore.getCache<MealPlan>("mealplan") || {};
      }
    },
    save: async (data: MealPlan): Promise<MealPlan> => {
      if (offlineStore.isOffline()) {
        offlineStore.enqueueMutation("mealPlan", "save", data);
        return data;
      }
      const res = await fetch("/api/mealplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save meal plan");
      const result: MealPlan = await res.json();

      // Keep cache fresh
      offlineStore.setCache("mealplan", result);
      return result;
    },
    autoPlan: async (
      recipes: Recipe[],
      pantry: PantryItem[]
    ): Promise<{ plan: MealPlan; rationale?: string; expiringIngredientsUsed?: string[] }> => {
      const res = await fetch("/api/gemini/auto-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipes, pantry }),
      });
      if (!res.ok) {
        throw new Error("Failed to auto-plan meals with pantry inventory.");
      }
      return await res.json();
    }
  },
  grocery: {
    list: async (): Promise<GroceryItem[]> => {
      if (offlineStore.isOffline()) {
        return offlineStore.getCache<GroceryItem[]>("grocery_list") || [];
      }
      try {
        const res = await fetch("/api/grocery");
        if (!res.ok) throw new Error("Failed to fetch grocery items");
        const list: GroceryItem[] = await res.json();
        offlineStore.setCache("grocery_list", list);
        return list;
      } catch (err) {
        console.warn("Fetch grocery list failed, falling back to cache", err);
        return offlineStore.getCache<GroceryItem[]>("grocery_list") || [];
      }
    },
    consolidateSmartList: async (recipes: Recipe[]): Promise<any[]> => {
      if (offlineStore.isOffline()) {
        throw new Error("AI Smart Shopping consolidation requires an active internet connection.");
      }
      const res = await fetch("/api/gemini/smart-shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipes }),
      });
      if (!res.ok) throw new Error("Failed to consolidate smart shopping list");
      return res.json();
    },
    create: async (data: Partial<GroceryItem>): Promise<GroceryItem> => {
      if (offlineStore.isOffline()) {
        const tempId = generateTempId("gro");
        const newItem: GroceryItem = {
          id: tempId,
          name: data.name || "Grocery Item",
          category: data.category || "Uncategorized",
          price: data.price || 0,
          quantity: data.quantity || "1 unit",
          checked: data.checked || false,
          store: data.store || "",
          created_date: new Date().toISOString(),
        };
        offlineStore.enqueueMutation("grocery", "create", newItem);
        return newItem;
      }
      const res = await fetch("/api/grocery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create grocery item");
      const result: GroceryItem = await res.json();

      // Keep cache fresh
      const cached = offlineStore.getCache<GroceryItem[]>("grocery_list") || [];
      offlineStore.setCache("grocery_list", [result, ...cached]);
      return result;
    },
    update: async (id: string, data: Partial<GroceryItem>): Promise<GroceryItem> => {
      if (offlineStore.isOffline()) {
        const cached = offlineStore.getCache<GroceryItem[]>("grocery_list") || [];
        const original = cached.find(item => item.id === id);
        const updatedItem: GroceryItem = {
          id,
          name: data.name ?? original?.name ?? "Grocery Item",
          category: data.category ?? original?.category ?? "Uncategorized",
          price: data.price ?? original?.price ?? 0,
          quantity: data.quantity ?? original?.quantity ?? "1 unit",
          checked: data.checked ?? original?.checked ?? false,
          store: data.store ?? original?.store ?? "",
          created_date: original?.created_date ?? new Date().toISOString(),
        };
        offlineStore.enqueueMutation("grocery", "update", data, id);
        return updatedItem;
      }
      const res = await fetch(`/api/grocery/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update grocery item");
      const result: GroceryItem = await res.json();

      // Keep cache fresh
      const cached = offlineStore.getCache<GroceryItem[]>("grocery_list") || [];
      const updatedList = cached.map(item => item.id === id ? result : item);
      offlineStore.setCache("grocery_list", updatedList);
      return result;
    },
    delete: async (id: string): Promise<void> => {
      if (offlineStore.isOffline()) {
        offlineStore.enqueueMutation("grocery", "delete", null, id);
        return;
      }
      const res = await fetch(`/api/grocery/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete grocery item");

      // Keep cache fresh
      const cached = offlineStore.getCache<GroceryItem[]>("grocery_list") || [];
      offlineStore.setCache("grocery_list", cached.filter(item => item.id !== id));
    },
    getSettings: async (): Promise<GrocerySettings> => {
      if (offlineStore.isOffline()) {
        return offlineStore.getCache<GrocerySettings>("grocery_settings") || { defaultStore: "", budgetLimit: 0 };
      }
      try {
        const res = await fetch("/api/grocery/settings");
        if (!res.ok) throw new Error("Failed to fetch grocery settings");
        const data: GrocerySettings = await res.json();
        offlineStore.setCache("grocery_settings", data);
        return data;
      } catch (err) {
        console.warn("Fetch grocery settings failed, falling back to cache", err);
        return offlineStore.getCache<GrocerySettings>("grocery_settings") || { defaultStore: "", budgetLimit: 0 };
      }
    },
    saveSettings: async (data: GrocerySettings): Promise<GrocerySettings> => {
      if (offlineStore.isOffline()) {
        offlineStore.enqueueMutation("grocerySettings", "saveSettings", data);
        return data;
      }
      const res = await fetch("/api/grocery/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save grocery settings");
      const result: GrocerySettings = await res.json();

      // Keep cache fresh
      offlineStore.setCache("grocery_settings", result);
      return result;
    }
  },
  fridge: {
    scanFridge: async (payload: {
      image?: string;
      rawItem?: string;
      raw_name?: string;
      department?: string;
      quantity?: number | string;
      items?: Array<{ raw_name?: string; name?: string; department?: string; category?: string; quantity?: number | string }>;
      rawItems?: any[];
    }) => {
      const res = await fetch("/api/gemini/scan-fridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to scan and reconcile fridge items");
      }
      return res.json();
    }
  },
  upc: {
    lookup: async (upc: string): Promise<{ upc: string; name: string; brand: string; category: string; qty: string; price: number; plu_code?: string | null; is_organic?: boolean }> => {
      // 1. Try unified 3-tier fallback search (PLU cache, Open Food Facts, Fallback tier)
      try {
        const results = await unifiedPantrySearch(upc);
        if (results && results.length > 0) {
          const top = results[0];
          return {
            upc: top.upc_code || (top.plu_code ? `PLU-${top.plu_code}` : upc),
            name: top.item_name,
            brand: top.brand || (top.is_organic ? "Organic Produce" : "Fresh Market"),
            category: top.category,
            qty: `${top.quantity} ${top.unit}`,
            price: top.price || 3.49,
            plu_code: top.plu_code,
            is_organic: top.is_organic,
          };
        }
      } catch (err) {
        console.warn("Unified search in upc.lookup failed, falling back to gemini route", err);
      }

      if (offlineStore.isOffline()) {
        throw new Error("UPC barcode scanner requires an active internet connection.");
      }
      const res = await fetch("/api/gemini/lookup-upc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upc }),
      });
      if (!res.ok) throw new Error("Failed to look up UPC barcode");
      return res.json();
    }
  },
  nutrition: {
    getGoals: async (): Promise<NutritionGoals> => {
      const defaultGoals: NutritionGoals = {
        useGovernment: true,
        country: "CA",
        customCalories: 2000,
        customProtein: 56,
        customCarbs: 225,
        customFat: 65,
        customSodium: 2300
      };
      if (offlineStore.isOffline()) {
        return offlineStore.getCache<NutritionGoals>("nutrition_goals") || defaultGoals;
      }
      try {
        const res = await fetch("/api/nutrition/goals");
        if (!res.ok) throw new Error("Failed to fetch nutrition goals");
        const data: NutritionGoals = await res.json();
        offlineStore.setCache("nutrition_goals", data);
        return data;
      } catch (err) {
        console.warn("Fetch nutrition goals failed, falling back to cache", err);
        return offlineStore.getCache<NutritionGoals>("nutrition_goals") || defaultGoals;
      }
    },
    saveGoals: async (data: NutritionGoals): Promise<NutritionGoals> => {
      if (offlineStore.isOffline()) {
        offlineStore.setCache("nutrition_goals", data);
        return data;
      }
      const res = await fetch("/api/nutrition/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save nutrition goals");
      const result: NutritionGoals = await res.json();
      offlineStore.setCache("nutrition_goals", result);
      return result;
    },
    listLogs: async (date?: string): Promise<NutritionLog[]> => {
      if (offlineStore.isOffline()) {
        const cached = offlineStore.getCache<NutritionLog[]>("nutrition_logs") || [];
        if (date) {
          return cached.filter(l => l.date === date);
        }
        return cached;
      }
      try {
        const url = date ? `/api/nutrition/logs?date=${date}` : "/api/nutrition/logs";
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch nutrition logs");
        const list: NutritionLog[] = await res.json();
        
        // Merge with cache nicely
        if (!date) {
          offlineStore.setCache("nutrition_logs", list);
        } else {
          const cached = offlineStore.getCache<NutritionLog[]>("nutrition_logs") || [];
          const otherDays = cached.filter(l => l.date !== date);
          offlineStore.setCache("nutrition_logs", [...otherDays, ...list]);
        }
        return list;
      } catch (err) {
        console.warn("Fetch nutrition logs failed, falling back to cache", err);
        const cached = offlineStore.getCache<NutritionLog[]>("nutrition_logs") || [];
        if (date) {
          return cached.filter(l => l.date === date);
        }
        return cached;
      }
    },
    createLog: async (data: Partial<NutritionLog>): Promise<NutritionLog> => {
      if (offlineStore.isOffline()) {
        const tempId = generateTempId("nut");
        const newLog: NutritionLog = {
          id: tempId,
          name: data.name || "Custom Food",
          recipeId: data.recipeId,
          calories: Math.round(Number(data.calories || 0)),
          protein: Math.round(Number(data.protein || 0)),
          carbs: Math.round(Number(data.carbs || 0)),
          fat: Math.round(Number(data.fat || 0)),
          sodium: Math.round(Number(data.sodium || 0)),
          servings: Number(data.servings || 1),
          date: data.date || new Date().toISOString().split("T")[0],
          created_date: new Date().toISOString()
        };
        const cached = offlineStore.getCache<NutritionLog[]>("nutrition_logs") || [];
        offlineStore.setCache("nutrition_logs", [...cached, newLog]);
        return newLog;
      }
      const res = await fetch("/api/nutrition/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create nutrition log");
      const result: NutritionLog = await res.json();
      
      const cached = offlineStore.getCache<NutritionLog[]>("nutrition_logs") || [];
      offlineStore.setCache("nutrition_logs", [...cached, result]);
      return result;
    },
    deleteLog: async (id: string): Promise<void> => {
      if (offlineStore.isOffline()) {
        const cached = offlineStore.getCache<NutritionLog[]>("nutrition_logs") || [];
        offlineStore.setCache("nutrition_logs", cached.filter(item => item.id !== id));
        return;
      }
      const res = await fetch(`/api/nutrition/logs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete nutrition log");
      
      const cached = offlineStore.getCache<NutritionLog[]>("nutrition_logs") || [];
      offlineStore.setCache("nutrition_logs", cached.filter(item => item.id !== id));
    },
    clearLogsForDate: async (date: string): Promise<void> => {
      if (offlineStore.isOffline()) {
        const cached = offlineStore.getCache<NutritionLog[]>("nutrition_logs") || [];
        offlineStore.setCache("nutrition_logs", cached.filter(item => item.date !== date));
        return;
      }
      const res = await fetch(`/api/nutrition/logs-clear?date=${encodeURIComponent(date)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to clear nutrition logs");
      
      const cached = offlineStore.getCache<NutritionLog[]>("nutrition_logs") || [];
      offlineStore.setCache("nutrition_logs", cached.filter(item => item.date !== date));
    },
    estimateRecipe: async (title: string, ingredients: (string | RecipeIngredient)[], servings?: number): Promise<RecipeNutrition> => {
      const stringIngs = ingredients.map(i => typeof i === "string" ? i : `${i.canonicalAmount || i.minAmount || ""} ${i.unit || ""} ${i.name} ${(i.modifiers || []).join(" ")}`.trim());
      if (offlineStore.isOffline()) {
        return {
          calories: 320,
          protein: 15,
          carbs: 35,
          fat: 10,
          sodium: 400
        };
      }
      const res = await fetch("/api/gemini/estimate-nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, ingredients: stringIngs, servings })
      });
      if (!res.ok) throw new Error("Failed to estimate recipe nutrition");
      return res.json();
    }
  },
  subscription: {
    getStatus: async (userId: string = "default_user") => {
      try {
        const res = await fetch(`/api/user/subscription?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error("Failed to fetch subscription");
        const data = await res.json();
        if (typeof window !== "undefined") {
          localStorage.setItem("kitchen_is_premium", data.is_premium ? "true" : "false");
        }
        return data;
      } catch (err) {
        console.warn("Using cached subscription state", err);
        const isPrem = typeof window !== "undefined" && localStorage.getItem("kitchen_is_premium") === "true";
        return {
          user_id: userId,
          subscription_tier: isPrem ? "premium" : "free",
          is_premium: isPrem,
          limits: {
            recipes: { limit: 15, current: 0, unlimited: isPrem, capped: false },
            pantry: { limit: 20, current: 0, unlimited: isPrem, capped: false },
          },
        };
      }
    },
    createCheckoutSession: async (userId: string = "default_user", email?: string) => {
      const res = await fetch("/api/payments/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create checkout session");
      }
      return res.json();
    },
    setSimulatedTier: async (tier: "free" | "premium", userId: string = "default_user") => {
      if (typeof window !== "undefined") {
        localStorage.setItem("kitchen_is_premium", tier === "premium" ? "true" : "false");
      }
      try {
        await fetch("/api/payments/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            tier === "premium"
              ? {
                  id: "evt_manual_" + Date.now(),
                  type: "checkout.session.completed",
                  data: {
                    object: {
                      client_reference_id: userId,
                      customer: "cus_manual_" + userId,
                      subscription: "sub_manual_" + userId,
                    },
                  },
                }
              : {
                  id: "evt_manual_" + Date.now(),
                  type: "customer.subscription.deleted",
                  data: {
                    object: {
                      id: "sub_manual_" + userId,
                      customer: "cus_manual_" + userId,
                      metadata: { userId },
                    },
                  },
                }
          ),
        });
      } catch (e) {
        console.warn("Backend webhook sync skipped:", e);
      }
    },
  }
};
