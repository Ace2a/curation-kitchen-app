/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Heart, Calendar, ShoppingBag, Activity, 
  FolderKanban, Layers, Sparkles, Barcode, 
  Globe, Loader2, CheckCircle2, Clock, Users, 
  ArrowRight, Utensils, ChefHat, X, Search,
  Coffee, Cookie, Cake, Plus, ExternalLink, Database, Check, Crown
} from "lucide-react";
import { KitchenLogo } from "../ui/KitchenLogo";
import { recipeClient } from "../../api/recipeClient";
import { Recipe, PantryItem, MealPlan, Collection } from "../../types";
import RecipeCard from "./RecipeCard";
import { LocalSearchIndex } from "../../lib/searchIndex";
import { ProStatusBadge } from "../subscription/ProStatusBadge";
import { UpgradeFlowModal } from "../subscription/UpgradeFlowModal";
import { useSubscriptionSync } from "../../hooks/useSubscriptionSync";

// Corporate Compliance Gate: Hide e-commerce routing panels & external cart buttons until partner agreements are approved
export const IS_AFFILIATE_ENABLED = false;

const MEAL_CATEGORIES = [
  {
    name: "Breakfast",
    icon: Coffee,
    iconColor: "text-amber-400",
    badgeBg: "bg-amber-500/20 border-amber-500/40",
    hoverBorder: "hover:border-amber-400/50 hover:bg-amber-500/10",
    activeClass: "border-amber-400 bg-amber-500/25 ring-2 ring-amber-400/60 shadow-lg",
  },
  {
    name: "Lunch",
    icon: Utensils,
    iconColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/20 border-emerald-500/40",
    hoverBorder: "hover:border-emerald-400/50 hover:bg-emerald-500/10",
    activeClass: "border-emerald-400 bg-emerald-500/25 ring-2 ring-emerald-400/60 shadow-lg",
  },
  {
    name: "Dinner",
    icon: ChefHat,
    iconColor: "text-rose-400",
    badgeBg: "bg-rose-500/20 border-rose-500/40",
    hoverBorder: "hover:border-rose-400/50 hover:bg-rose-500/10",
    activeClass: "border-rose-400 bg-rose-500/25 ring-2 ring-rose-400/60 shadow-lg",
  },
  {
    name: "Snacks",
    icon: Cookie,
    iconColor: "text-orange-400",
    badgeBg: "bg-orange-500/20 border-orange-500/40",
    hoverBorder: "hover:border-orange-400/50 hover:bg-orange-500/10",
    activeClass: "border-orange-400 bg-orange-500/25 ring-2 ring-orange-400/60 shadow-lg",
  },
  {
    name: "Dessert",
    icon: Cake,
    iconColor: "text-pink-400",
    badgeBg: "bg-pink-500/20 border-pink-500/40",
    hoverBorder: "hover:border-pink-400/50 hover:bg-pink-500/10",
    activeClass: "border-pink-400 bg-pink-500/25 ring-2 ring-pink-400/60 shadow-lg",
  },
];

interface ParsedIngredient {
  name: string;
  quantity?: number;
  amount?: number;
  unit?: string;
  modifiers?: string[];
  modifier?: string;
}

interface ParsedRecipeData {
  id?: string;
  recipe_name?: string;
  title?: string;
  description?: string;
  prep_time?: string;
  cook_time?: string;
  servings?: number;
  ingredients?: (string | ParsedIngredient)[];
  raw_ingredients?: any[];
  formatted_ingredients?: string[];
  steps?: string[];
  instructions?: string[];
  tags?: string[];
  pantry?: any[];
}

type SearchMode = "saved" | "web" | "parse";

/**
 * RecipeDashboard acts as the primary culinary hub of Curation Kitchen.
 * Restored to a clean, elegant, high-end aesthetic:
 * 1. Hide loose recipes by default: recipe cards appear ONLY after actively searching or clicking a meal category.
 * 2. Restored dedicated grid blocks for 5 meal categories (Breakfast, Lunch, Dinner, Snacks, Dessert).
 * 3. Meal category clicks filter recipes immediately on-screen without navigating away.
 * 4. Accented, elegant unified search bar with clean, integrated button toggles for Web Search and Paste & Parse.
 */
export function RecipeDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Search mode & query state
  const [searchMode, setSearchMode] = useState<SearchMode>("saved");
  const [savedSearchQuery, setSavedSearchQuery] = useState("");
  const [selectedMealCategory, setSelectedMealCategory] = useState<string | null>(null);

  // Web search state
  const [webQuery, setWebQuery] = useState("");
  const [webResults, setWebResults] = useState<any[]>([]);
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [webSearchError, setWebSearchError] = useState<string | null>(null);
  const [importingWebUrl, setImportingWebUrl] = useState<string | null>(null);
  const [importedWebUrls, setImportedWebUrls] = useState<Set<string>>(new Set());

  // Raw text ingestion state
  const [rawRecipeText, setRawRecipeText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [importedRecipe, setImportedRecipe] = useState<ParsedRecipeData | null>(null);

  // TanStack Query live data hooks
  const { data: pantryItems = [] } = useQuery<PantryItem[]>({
    queryKey: ["pantry"],
    queryFn: () => recipeClient.pantry.list(),
  });

  const { data: mealPlan } = useQuery<MealPlan>({
    queryKey: ["mealPlan"],
    queryFn: () => recipeClient.mealPlan.get(),
  });

  const { data: queryRecipes = [] } = useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: () => recipeClient.recipes.list("-created_date"),
  });

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ["collections"],
    queryFn: () => recipeClient.collections.list("-created_date"),
  });

  // User Profile & Subscription Tier Hook with real-time polling and listener mechanisms
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const {
    subscription: userSub,
    isPremium,
    isPollingActive,
    showUpgradeCelebration,
    dismissCelebration,
  } = useSubscriptionSync("default_user");

  // Local-first search index
  const searchIndex = useMemo(() => {
    return new LocalSearchIndex(queryRecipes);
  }, [queryRecipes]);

  // Is user actively searching or filtering by category?
  const hasActiveQuery = savedSearchQuery.trim().length > 0;
  const hasActiveCategory = selectedMealCategory !== null;
  const isFilteringActive = hasActiveQuery || hasActiveCategory;

  // Filtered saved recipes: ONLY computed and displayed when user actively searches or clicks a category!
  const filteredSavedRecipes = useMemo(() => {
    if (!isFilteringActive) return [];

    let baseList = queryRecipes;

    if (selectedMealCategory) {
      const catLower = selectedMealCategory.toLowerCase();
      baseList = baseList.filter((r) => {
        const headingMatch = r.meal_heading?.toLowerCase() === catLower;
        const tagMatch = (r.tags || []).some((t) => t.toLowerCase() === catLower);
        return headingMatch || tagMatch;
      });
    }

    if (!hasActiveQuery) {
      return baseList;
    }

    const indexed = searchIndex.search(savedSearchQuery.trim());
    if (selectedMealCategory) {
      const catLower = selectedMealCategory.toLowerCase();
      return indexed.filter((r) => {
        const headingMatch = r.meal_heading?.toLowerCase() === catLower;
        const tagMatch = (r.tags || []).some((t) => t.toLowerCase() === catLower);
        return headingMatch || tagMatch;
      });
    }
    return indexed;
  }, [queryRecipes, searchIndex, savedSearchQuery, selectedMealCategory, isFilteringActive, hasActiveQuery]);

  // Handle clicking a category block: toggles filter and ensures saved mode
  const handleCategoryClick = (categoryName: string) => {
    if (selectedMealCategory === categoryName) {
      setSelectedMealCategory(null);
    } else {
      setSelectedMealCategory(categoryName);
      if (searchMode !== "saved") {
        setSearchMode("saved");
      }
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSavedSearchQuery("");
    setSelectedMealCategory(null);
  };

  // PANTRY HUB TILE LOGIC:
  const isQuantityZero = (item: PantryItem): boolean => {
    if (item.status === "Out of Stock") return true;
    const raw = item.quantity;
    if (raw === undefined || raw === null || raw === "") {
      return item.status === "Running Low";
    }
    if (typeof raw === "number") return raw <= 0.0;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (
        trimmed === "0" ||
        trimmed === "0.0" ||
        trimmed === "0 units" ||
        trimmed === "0g" ||
        trimmed === "0.0g" ||
        trimmed === "0 items" ||
        trimmed === "0 lbs" ||
        trimmed === "0 oz" ||
        trimmed === "0 ml"
      ) {
        return true;
      }
      const match = trimmed.match(/-?\d+(\.\d+)?/);
      if (match) {
        const parsedFloat = parseFloat(match[0]);
        if (!isNaN(parsedFloat) && parsedFloat <= 0.0) return true;
      }
      if (trimmed.toLowerCase().includes("out") || trimmed.toLowerCase().includes("empty")) {
        return true;
      }
    }
    return false;
  };

  const lowOrEmptyPantryItems = pantryItems.filter(isQuantityZero);
  const lowOrEmptyCount = lowOrEmptyPantryItems.length;
  const hasLowOrEmptyPantry = lowOrEmptyCount > 0;

  // MEAL PLANNER TILE LOGIC:
  const countScheduledMealSlots = (plan: MealPlan | undefined | null): number => {
    if (!plan) return 0;
    let count = 0;
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const slots = ["breakfast", "lunch", "dinner"] as const;

    days.forEach((day) => {
      const dayObj = (plan as any)[day];
      let countedInNested = false;
      if (dayObj && typeof dayObj === "object") {
        slots.forEach((slot) => {
          const val = dayObj[slot];
          if (val && typeof val === "string" && val.trim() !== "") {
            count++;
            countedInNested = true;
          } else if (val && typeof val === "object" && (val.id || val.title || val.recipeId)) {
            count++;
            countedInNested = true;
          }
        });
      }

      if (!countedInNested) {
        slots.forEach((slot) => {
          const capitalizedSlot = slot.charAt(0).toUpperCase() + slot.slice(1);
          const camel = `${day}${capitalizedSlot}`;
          const snake = `${day}_${slot}`;
          const valCamel = (plan as any)[camel];
          const valSnake = (plan as any)[snake];
          if (valCamel && typeof valCamel === "string" && valCamel.trim() !== "") {
            count++;
          } else if (valSnake && typeof valSnake === "string" && valSnake.trim() !== "") {
            count++;
          }
        });
      }
    });

    return count;
  };

  const scheduledMealSlotsCount = countScheduledMealSlots(mealPlan);
  const isMealPlanScheduled = scheduledMealSlotsCount > 0;

  // Network status synchronization
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Web Recipe Search Handler
  const handleWebSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? webQuery).trim();
    if (!q) return;
    if (overrideQuery) {
      setWebQuery(overrideQuery);
    }
    setIsWebSearching(true);
    setWebSearchError(null);

    try {
      const response = await fetch("/api/gemini/search-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      setWebResults(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Web Search error:", err);
      setWebSearchError(err.message || "Failed to retrieve web search results. Please try again.");
    } finally {
      setIsWebSearching(false);
    }
  };

  // Import recipe directly from web search results
  const handleImportWebRecipe = async (item: any) => {
    if (!item.url) return;
    setImportingWebUrl(item.url);

    try {
      const response = await fetch("/api/gemini/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: item.url }),
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const parsed = await response.json();
      const rawIngs = parsed.ingredients || parsed.formatted_ingredients || [];
      const formattedIngredients = rawIngs.map((ing: any) => {
        if (typeof ing === "object" && ing !== null) {
          const qty = ing.quantity !== undefined ? ing.quantity : (ing.amount !== undefined ? ing.amount : "");
          const unit = ing.unit || "";
          const name = ing.name || "";
          const mods = Array.isArray(ing.modifiers) ? ing.modifiers.join(", ") : (ing.modifier || "");
          return `${qty} ${unit} ${name}${mods ? ` (${mods})` : ""}`.replace(/\s+/g, " ").trim();
        }
        return String(ing);
      });

      const newRecipePayload = {
        title: parsed.title || parsed.recipe_name || item.title || "Imported Recipe",
        description: parsed.description || item.description || "Discovered via AI Web Search.",
        prep_time: parsed.prep_time || item.prepTime || "15 mins",
        cook_time: parsed.cook_time || item.cookTime || "30 mins",
        servings: parsed.servings || 4,
        image_url: parsed.image_url || undefined,
        meal_heading: (parsed.meal_heading || item.meal_heading || "dinner").toLowerCase(),
        ingredients: formattedIngredients,
        instructions: parsed.instructions || parsed.steps || [],
        tags: parsed.tags || ["Imported", "Web Search"],
        is_favorite: false,
      };

      const saveRes = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecipePayload),
      });

      if (!saveRes.ok) {
        throw new Error("Failed to save imported recipe to database.");
      }

      setImportedWebUrls((prev) => new Set(prev).add(item.url));
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    } catch (err: any) {
      console.error("Web import failed:", err);
      alert(err.message || "Failed to parse and import recipe.");
    } finally {
      setImportingWebUrl(null);
    }
  };

  // Sample recipe text helper to test inline text parsing
  const handleLoadSampleText = () => {
    setRawRecipeText(
      `Summer Heirloom Bruschetta\n` +
      `Ingredients:\n` +
      `- 3 1/2 cups of flour\n` +
      `- a pinch of kosher salt\n` +
      `- 2 cups heavy cream, chilled and whipped\n` +
      `- 3 medium heirloom tomatoes\n` +
      `- 2 tbsp extra virgin olive oil\n\n` +
      `Instructions:\n` +
      `1. Sift flour with a pinch of kosher salt and bake crostini bases.\n` +
      `2. Gently fold chilled and whipped heavy cream into fresh ricotta.\n` +
      `3. Dice heirloom tomatoes, toss with olive oil, and layer generously on toasted slices.`
    );
    setImportError(null);
  };

  // Inline Raw Text Ingestion Handler
  const handleImportRecipe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedInput = rawRecipeText.trim();
    if (!trimmedInput) {
      setImportError("Please paste recipe text, ingredients, or cooking steps first.");
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportSuccessMessage(null);

    try {
      const response = await fetch("/api/recipes/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: trimmedInput,
          rawBlogText: trimmedInput,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}. Failed to parse recipe.`);
      }

      const parsedData = await response.json();
      const parsedRecipe = parsedData.recipe || parsedData;
      const title = parsedRecipe.title || parsedRecipe.recipe_name || "Imported Recipe";

      const formattedIngredientsList =
        parsedData.formatted_ingredients && parsedData.formatted_ingredients.length > 0
          ? parsedData.formatted_ingredients
          : Array.isArray(parsedRecipe.ingredients) &&
            parsedRecipe.ingredients.length > 0 &&
            typeof parsedRecipe.ingredients[0] === "string"
          ? parsedRecipe.ingredients
          : Array.isArray(parsedData.ingredients) &&
            parsedData.ingredients.length > 0 &&
            typeof parsedData.ingredients[0] === "string"
          ? parsedData.ingredients
          : parsedData.raw_ingredients || parsedRecipe.ingredients || [];

      const stepList = parsedRecipe.instructions || parsedRecipe.steps || parsedData.instructions || [];

      const newRecipePayload = {
        title,
        description: parsedRecipe.description || "Freshly imported with Gemini AI parser.",
        prep_time: parsedRecipe.prep_time || "15 mins",
        cook_time: parsedRecipe.cook_time || "20 mins",
        servings: parsedRecipe.servings || 4,
        ingredients: formattedIngredientsList,
        instructions: stepList,
        tags: ["Imported", "AI Parsed"],
        meal_heading: parsedRecipe.meal_heading || "dinner",
        is_favorite: false,
      };

      let savedRecord = null;
      try {
        const saveRes = await fetch("/api/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newRecipePayload),
        });
        if (saveRes.ok) {
          savedRecord = await saveRes.json();
        }
      } catch (saveErr) {
        console.warn("Could not save recipe to database", saveErr);
      }

      const targetId = savedRecord?.id || `rec-${Date.now()}`;
      const displayRecipe: ParsedRecipeData = {
        ...parsedData,
        ...parsedRecipe,
        id: targetId,
        title,
        recipe_name: title,
        ingredients: formattedIngredientsList,
        instructions: stepList,
      };

      setImportedRecipe(displayRecipe);
      setImportSuccessMessage(`"${title}" was parsed and saved to your collection!`);
      setRawRecipeText("");

      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
      queryClient.invalidateQueries({ queryKey: ["mealPlan"] });
    } catch (err: any) {
      console.error("Recipe import failed:", err);
      setImportError(err.message || "An error occurred while communicating with the import engine.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative text-zinc-900 dark:text-zinc-100 flex flex-col justify-between font-sans selection:bg-[#D95338]/30 overflow-x-hidden">
      
      {/* 1. FULL-SCREEN WALLPAPER BACKGROUND LAYER */}
      <div className="fixed inset-0 z-0 w-full h-full pointer-events-none overflow-hidden bg-zinc-950">
        <img
          src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=2000&q=80"
          alt="Culinary Wallpaper"
          className="w-full h-full object-cover object-center transform scale-100"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/70 to-black/90 backdrop-blur-[2px]" />
      </div>

      {/* 2. MAIN CONTENT CONTAINER */}
      <main className="relative z-10 w-full max-w-xl sm:max-w-2xl mx-auto px-3.5 sm:px-4 py-4 sm:py-6 flex-1 flex flex-col justify-start gap-4">
        
        {/* BRANDING HEADER */}
        <header className="w-full p-4 sm:p-5 rounded-2xl bg-black/55 backdrop-blur-xl border border-white/20 shadow-xl text-white flex flex-col items-center justify-center text-center relative">
          
          {/* Top Utility Row */}
          <div className="w-full flex items-center justify-between mb-2 text-[10px]">
            <span className="inline-flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/20 bg-black/50 text-emerald-300 backdrop-blur-md">
              <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
              {isOffline ? "OFFLINE" : "ONLINE"}
            </span>

            {/* Dynamic Pro Status Badge */}
            <ProStatusBadge onOpenUpgrade={() => setIsUpgradeModalOpen(true)} />
          </div>

          {/* Centered App Logo & Title */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative mb-2">
              <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#D95338] via-orange-500 to-amber-500 shadow-lg ring-2 ring-white/30 overflow-hidden transform hover:scale-105 transition-transform duration-300">
                <div className="absolute inset-0.5 rounded-full border border-dashed border-white/35" />
                <KitchenLogo className="w-6 h-6 sm:w-7 sm:h-7 text-white z-30" plateColor="white" letterColor="white" />
              </div>
              <div className="absolute -top-1 -right-1 z-40 pointer-events-none flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-200 drop-shadow-[0_0_4px_rgba(253,224,71,1)]" />
              </div>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-serif font-extrabold tracking-tight text-white drop-shadow-md text-center">
              Curation Kitchen
            </h1>
            <p className="text-xs sm:text-[13px] font-medium text-amber-300/90 leading-normal tracking-wide text-center mt-0.5">
              The Smart Digital Culinary Assistant
            </p>
          </div>
        </header>

        {/* 1. PRO UPGRADE CELEBRATION TOAST / BANNER */}
        {showUpgradeCelebration && (
          <div className="w-full p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/30 via-orange-500/25 to-amber-500/20 border border-amber-400/60 backdrop-blur-2xl shadow-2xl flex items-center justify-between text-white animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-400/30 border border-amber-300/50 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-bounce" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-amber-200">
                  🎉 Pro Status Activated!
                </h4>
                <p className="text-[11px] text-stone-200 leading-tight">
                  Welcome to Curation Kitchen Pro! Unlimited recipes, pantry tracking &amp; AI meal planner unlocked.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissCelebration}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors cursor-pointer ml-2 shrink-0"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2. REAL-TIME STRIPE CHECKOUT VERIFICATION POLLING INDICATOR */}
        {isPollingActive && !isPremium && (
          <div className="w-full p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-400/40 backdrop-blur-md flex items-center justify-between text-cyan-200 text-xs animate-pulse">
            <div className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
              <span>Verifying Stripe checkout confirmation... Updating Pro badge automatically.</span>
            </div>
          </div>
        )}

        {/* 3. FREE TIER PRO UPGRADE TEASER BANNER */}
        {userSub && !userSub.is_premium && !isPollingActive && (
          <div 
            onClick={() => setIsUpgradeModalOpen(true)}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 hover:from-amber-500/25 hover:via-orange-500/20 hover:to-amber-500/15 border border-amber-400/40 hover:border-amber-400/70 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone-200 cursor-pointer transition-all hover:scale-[1.005] group shadow-xl"
          >
            <div className="flex items-start sm:items-center gap-2.5 min-w-0 w-full sm:w-auto">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-400/50 flex items-center justify-center shrink-0 text-amber-300 group-hover:scale-105 transition-transform shadow-xs mt-0.5 sm:mt-0">
                <Crown className="w-4 h-4 text-amber-300 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-white text-xs tracking-tight">Unlock Unlimited Pro Access</span>
                  <span className="text-[9.5px] text-amber-300 font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500/25 border border-amber-400/40">
                    $4.99/mo
                  </span>
                </div>
                <p className="text-[10.5px] text-stone-300 leading-normal mt-0.5">
                  Unlimited recipes, infinite pantry hub &amp; multi-week AI meal planner.
                </p>
              </div>
            </div>
            <span className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#D95338] text-white text-xs font-black uppercase tracking-wider shrink-0 flex items-center justify-center gap-1.5 group-hover:brightness-110 shadow-sm transition-all text-center">
              <span>Upgrade</span> <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        )}

        {/* =================================================================== */}
        {/* 3. ACCENTED, ELEGANT UNIFIED SEARCH BAR                             */}
        {/* Clean, high-end styling with simple button toggles alongside/below */}
        {/* =================================================================== */}
        <section 
          id="unified-search-import-area"
          className="w-full bg-black/50 backdrop-blur-xl border border-white/20 rounded-2xl p-3 sm:p-3.5 shadow-xl text-white space-y-2.5 transition-all"
        >
          {/* Main Input Row */}
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              {searchMode === "web" ? (
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
              ) : (
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              )}

              {searchMode === "web" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleWebSearch();
                  }}
                  className="w-full"
                >
                  <input
                    type="text"
                    value={webQuery}
                    onChange={(e) => setWebQuery(e.target.value)}
                    placeholder="Search the web for any recipe (e.g. Pad Thai, Lemon Tart)..."
                    className="w-full bg-black/40 border border-cyan-500/30 focus:border-cyan-400 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition-all"
                  />
                  {webQuery && (
                    <button
                      type="button"
                      onClick={() => setWebQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </form>
              ) : (
                <>
                  <input
                    type="text"
                    value={savedSearchQuery}
                    onChange={(e) => {
                      setSavedSearchQuery(e.target.value);
                      if (searchMode !== "saved") setSearchMode("saved");
                    }}
                    placeholder={
                      selectedMealCategory 
                        ? `Search within ${selectedMealCategory}...` 
                        : "Search saved recipes by name, ingredient, or tag..."
                    }
                    className="w-full bg-black/40 border border-white/20 focus:border-amber-400 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-all"
                  />
                  {savedSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSavedSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Quick Web Search Trigger (when in web mode) */}
            {searchMode === "web" && (
              <button
                type="button"
                disabled={isWebSearching || !webQuery.trim()}
                onClick={() => handleWebSearch()}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md"
              >
                {isWebSearching ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="hidden sm:inline">Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Simple, Elegant Button Toggles Integrated Underneath Input Bar */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs pt-0.5">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
              {/* Toggle 1: Search Saved Recipes */}
              <button
                type="button"
                onClick={() => setSearchMode("saved")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial min-h-[44px] ${
                  searchMode === "saved"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-xs"
                    : "bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10"
                }`}
              >
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Search Saved Recipes</span>
              </button>

              {/* Toggle 2: Search Web */}
              <button
                type="button"
                onClick={() => {
                  if (searchMode === "web") {
                    setSearchMode("saved");
                  } else {
                    setSearchMode("web");
                    if (savedSearchQuery.trim()) {
                      setWebQuery(savedSearchQuery.trim());
                      handleWebSearch(savedSearchQuery.trim());
                    }
                  }
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial min-h-[44px] ${
                  searchMode === "web"
                    ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 shadow-xs"
                    : "bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10"
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Search Web</span>
              </button>

              {/* Toggle 3: AI Recipe Parser */}
              <button
                type="button"
                onClick={() => {
                  setSearchMode(searchMode === "parse" ? "saved" : "parse");
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial min-h-[44px] ${
                  searchMode === "parse"
                    ? "bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-200 border border-amber-400/60 shadow-xs"
                    : "bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>AI Recipe Parser</span>
              </button>
            </div>

            {/* Clear Active Filters Pill (shown when user has active query or category) */}
            {isFilteringActive && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-amber-300 font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors min-h-[44px]"
                title="Clear all active search filters"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* E-COMMERCE ROUTING PANEL & PARTNER RETAIL BUTTONS (Gated by IS_AFFILIATE_ENABLED) */}
          {IS_AFFILIATE_ENABLED && (
            <div className="pt-2.5 border-t border-white/10 animate-in fade-in duration-150">
              <div className="p-3 rounded-xl bg-black/40 border border-white/15 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Partner Grocery Delivery</span>
                  </span>
                  <span className="text-[9px] font-semibold text-stone-400">External Retail Cart</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.open("https://instacart.ca", "_blank", "noopener,noreferrer")}
                    className="flex-1 sm:flex-initial min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    🛒 <span>Instacart</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open("https://voila.ca", "_blank", "noopener,noreferrer")}
                    className="flex-1 sm:flex-initial min-h-[36px] px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    🥬 <span>Voilà</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open("https://walmart.ca", "_blank", "noopener,noreferrer")}
                    className="flex-1 sm:flex-initial min-h-[36px] px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    🏬 <span>Walmart</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* INLINE WEB SEARCH EXPANSION (when Web toggle is active) */}
          {searchMode === "web" && (
            <div className="pt-2 border-t border-white/10 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                <span className="text-[10px] text-stone-400 uppercase font-bold shrink-0">Try:</span>
                {["Authentic Pad Thai", "Creamy Mushroom Risotto", "Crispy Salmon Bowl", "Tiramisu"].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setWebQuery(sample);
                      handleWebSearch(sample);
                    }}
                    className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white border border-white/10 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>

              {webSearchError && (
                <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                  <span>{webSearchError}</span>
                </div>
              )}

              {webResults.length > 0 && (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  <p className="text-[10.5px] text-stone-400 font-bold uppercase tracking-wider">
                    Web Results ({webResults.length})
                  </p>
                  {webResults.map((item, idx) => {
                    const isImported = importedWebUrls.has(item.url);
                    const isCurrentlyImporting = importingWebUrl === item.url;
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/15 hover:border-cyan-400/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-white hover:text-cyan-300 transition-colors">
                              {item.title}
                            </h4>
                            {item.source && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                {item.source}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[10.5px] text-stone-300 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-[9.5px] text-stone-400 pt-0.5">
                            {item.prepTime && <span>Prep: {item.prepTime}</span>}
                            {item.cookTime && <span>Cook: {item.cookTime}</span>}
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-cyan-400 hover:underline"
                              >
                                <span>Source</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isImported ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Saved</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isCurrentlyImporting}
                              onClick={() => handleImportWebRecipe(item)}
                              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-[#D95338] hover:from-amber-400 hover:to-[#D95338] text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer shadow-sm transition-all"
                            >
                              {isCurrentlyImporting ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Importing...</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>Import</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* INLINE RAW TEXT PARSING EXPANSION (when AI Recipe Parser toggle is active) */}
          {searchMode === "parse" && (
            <div className="pt-2 border-t border-white/10 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Recipe Parser</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadSampleText}
                    className="text-[10px] font-bold text-amber-300 hover:underline cursor-pointer"
                  >
                    Load Sample
                  </button>
                  {rawRecipeText && (
                    <button
                      type="button"
                      onClick={() => setRawRecipeText("")}
                      className="text-[10px] text-stone-400 hover:text-stone-200 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {importedRecipe && importSuccessMessage ? (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">
                        {importedRecipe.title}
                      </h4>
                      <p className="text-[10.5px] text-emerald-300">
                        Successfully parsed and added to your collection!
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setImportSuccessMessage(null);
                        setImportedRecipe(null);
                        setRawRecipeText("");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 text-[11px] font-bold cursor-pointer"
                    >
                      Parse Another
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/recipes/${importedRecipe.id}`)}
                      className="flex-1 py-1 px-2.5 rounded-lg bg-[#D95338] hover:bg-[#c2462e] text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Open Recipe</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleImportRecipe} className="space-y-2">
                  <textarea
                    value={rawRecipeText}
                    onChange={(e) => setRawRecipeText(e.target.value)}
                    placeholder="Paste raw recipe text, ingredients, cooking fractions, or blog excerpts here..."
                    rows={3}
                    disabled={isImporting}
                    className="w-full bg-black/60 border border-white/20 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-y min-h-[85px] leading-relaxed font-sans"
                  />

                  {importError && (
                    <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 text-[11px] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                      <span>{importError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="submit"
                      disabled={isImporting || !rawRecipeText.trim()}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-[#D95338] hover:from-amber-400 hover:to-[#D95338] disabled:opacity-50 text-white font-extrabold text-[11px] tracking-wider uppercase flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-white" />
                          <span>Parsing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-yellow-200 fill-yellow-200" />
                          <span>Parse &amp; Save</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>

        {/* =================================================================== */}
        {/* 4. RESTORED BEAUTIFUL 5 MEAL CATEGORY GRID BLOCKS                   */}
        {/* Clicking triggers on-screen search filtering without opening a page */}
        {/* =================================================================== */}
        <section className="w-full space-y-2">
          <div className="flex items-center justify-between px-1 text-[11px] text-stone-300 font-bold">
            <span className="flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300 uppercase tracking-widest text-[10px] font-black">Meal Categories</span>
            </span>
            {selectedMealCategory && (
              <button
                type="button"
                onClick={() => setSelectedMealCategory(null)}
                className="text-[10.5px] text-amber-300 hover:underline cursor-pointer font-semibold"
              >
                Clear Category Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full">
            {MEAL_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedMealCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => handleCategoryClick(cat.name)}
                  className={`group flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer text-center ${
                    isSelected
                      ? cat.activeClass
                      : `bg-black/50 hover:bg-black/70 border border-white/15 ${cat.hoverBorder} shadow-md`
                  }`}
                  title={`Filter recipes by ${cat.name}`}
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${cat.badgeBg} border flex items-center justify-center mb-1 group-hover:scale-105 transition-transform`}>
                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${cat.iconColor}`} />
                  </div>
                  <span className={`text-[10px] sm:text-[11px] font-bold truncate w-full ${isSelected ? "text-white" : "text-stone-200 group-hover:text-white"}`}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* =================================================================== */}
        {/* 5. SEARCH & CATEGORY FILTER RESULTS (ONLY SHOWN WHEN FILTERING)    */}
        {/* Completely hidden on default load; appears ONLY when active query   */}
        {/* =================================================================== */}
        {isFilteringActive && (
          <section className="w-full bg-black/60 backdrop-blur-2xl border border-white/20 rounded-2xl p-3.5 sm:p-4 shadow-2xl text-white space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs text-stone-300">
              <span className="font-bold flex items-center gap-1.5 text-amber-300">
                <Search className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {selectedMealCategory 
                    ? selectedMealCategory 
                    : hasActiveQuery 
                    ? `Results for "${savedSearchQuery}"` 
                    : "Search Results"}
                </span>
              </span>
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-[11px] text-amber-300 hover:underline font-bold cursor-pointer"
              >
                Clear Search
              </button>
            </div>

            {filteredSavedRecipes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {filteredSavedRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    collections={collections}
                    onEdit={(r) => navigate(`/recipes/edit/${r.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-black/40 border border-white/10 text-center space-y-3">
                <p className="text-xs text-stone-300">
                  No saved recipes found {hasActiveQuery && `matching "${savedSearchQuery}"`}
                  {selectedMealCategory && ` in ${selectedMealCategory}`}.
                </p>
                {hasActiveQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchMode("web");
                      setWebQuery(savedSearchQuery);
                      handleWebSearch(savedSearchQuery);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#D95338] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-110 transition-all"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Search the Web for "{savedSearchQuery}" instead</span>
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* =================================================================== */}
        {/* 6. CLEAN CULINARY WORKSPACE GRID                                    */}
        {/* Streamlined, symmetrical 4-hub workspace: Pantry, Planner, Folders, UPC */}
        {/* =================================================================== */}
        <section className="w-full space-y-2">
          <div className="flex items-center justify-between px-1 text-[11px] text-stone-300 font-bold">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300 uppercase tracking-widest text-[10px] font-black">Culinary Workspace</span>
            </span>
            <span className="text-stone-300 text-[11px]">
              <span className="text-emerald-400 font-extrabold">{pantryItems.length}</span> pantry items
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full">
            
            {/* WORKSPACE TILE 1: PANTRY HUB */}
            <div 
              id="workspace-tile-pantry"
              onClick={() => navigate("/pantry")}
              className="group relative bg-black/50 hover:bg-black/70 backdrop-blur-xl border border-white/15 hover:border-emerald-400/50 rounded-2xl p-3 shadow-lg flex flex-col justify-between min-h-[115px] sm:min-h-[125px] cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between h-7">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </div>
                  <div 
                    id="pantry-hub-badge"
                    className={`absolute top-3 right-3 h-[20px] px-1.5 rounded-full inline-flex items-center justify-center text-[8px] font-black uppercase tracking-wider whitespace-nowrap pointer-events-none transition-colors duration-200 ${
                      hasLowOrEmptyPantry
                        ? "text-[#D95338] bg-[#D95338]/15 border border-[#D95338]/40 shadow-xs"
                        : "text-stone-300 bg-stone-500/20 border border-stone-400/30"
                    }`}
                  >
                    <span className="truncate max-w-[85px] sm:max-w-none">
                      {hasLowOrEmptyPantry ? `⚠️ ${lowOrEmptyCount} Low` : `${pantryItems.length} Stocked`}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white group-hover:text-emerald-300 transition-colors leading-tight">
                    Pantry Hub
                  </h4>
                  <p className="text-[9.5px] text-stone-300 font-medium leading-tight line-clamp-1 mt-0.5">
                    Live stock &amp; alerts.
                  </p>
                </div>
              </div>

              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-bold">
                <span className={hasLowOrEmptyPantry ? "text-[#D95338] truncate font-extrabold" : "text-emerald-400 truncate"}>
                  {pantryItems.length} items
                </span>
                <span className="text-stone-300 flex items-center gap-0.5 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all shrink-0">
                  Open <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>

            {/* WORKSPACE TILE 2: WEEKLY MEAL PLANNER */}
            <div 
              id="workspace-tile-planner"
              onClick={() => navigate("/planner")}
              className="group relative bg-black/50 hover:bg-black/70 backdrop-blur-xl border border-white/15 hover:border-amber-400/50 rounded-2xl p-3 shadow-lg flex flex-col justify-between min-h-[115px] sm:min-h-[125px] cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between h-7">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div 
                    id="meal-planner-badge"
                    className={`absolute top-3 right-3 h-[20px] px-1.5 rounded-full inline-flex items-center justify-center text-[8px] font-black uppercase tracking-wider whitespace-nowrap pointer-events-none transition-colors duration-200 ${
                      isMealPlanScheduled
                        ? "text-[#6E8B6B] bg-[#6E8B6B]/15 border border-[#6E8B6B]/40 shadow-xs"
                        : "text-stone-400 bg-stone-500/10 border border-stone-500/40"
                    }`}
                  >
                    <span className="truncate max-w-[85px] sm:max-w-none">
                      {isMealPlanScheduled ? "Scheduled" : "Empty Slate"}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white group-hover:text-amber-300 transition-colors leading-tight">
                    Meal Planner
                  </h4>
                  <p className="text-[9.5px] text-stone-300 font-medium leading-tight line-clamp-1 mt-0.5">
                    Weekly schedules.
                  </p>
                </div>
              </div>

              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-bold">
                <span className={isMealPlanScheduled ? "text-[#6E8B6B] truncate font-extrabold" : "text-stone-400 truncate"}>
                  {isMealPlanScheduled ? `${scheduledMealSlotsCount} planned` : "Empty slate"}
                </span>
                <span className="text-stone-300 flex items-center gap-0.5 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0">
                  Plan <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>

            {/* WORKSPACE TILE 3: COLLECTIONS DIRECTORY */}
            <div 
              id="workspace-tile-collections"
              onClick={() => navigate("/collections")}
              className="group relative bg-black/50 hover:bg-black/70 backdrop-blur-xl border border-white/15 hover:border-[#D95338]/50 rounded-2xl p-3 shadow-lg flex flex-col justify-between min-h-[115px] sm:min-h-[125px] cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between h-7">
                  <div className="w-7 h-7 rounded-lg bg-[#D95338]/20 border border-[#D95338]/40 flex items-center justify-center text-[#D95338] group-hover:scale-105 transition-transform shrink-0">
                    <FolderKanban className="w-3.5 h-3.5" />
                  </div>
                  <span className="absolute top-3 right-3 h-[20px] px-1.5 rounded-full inline-flex items-center justify-center text-[8px] font-black uppercase tracking-wider whitespace-nowrap text-[#D95338] bg-[#D95338]/10 border border-[#D95338]/30 pointer-events-none">
                    Folders
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white group-hover:text-[#D95338] transition-colors leading-tight">
                    Collections
                  </h4>
                  <p className="text-[9.5px] text-stone-300 font-medium leading-tight line-clamp-1 mt-0.5">
                    Categorized folders.
                  </p>
                </div>
              </div>

              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-bold">
                <span className="text-orange-400 truncate">
                  {collections.length} folders
                </span>
                <span className="text-stone-300 flex items-center gap-0.5 group-hover:text-[#D95338] group-hover:translate-x-0.5 transition-all shrink-0">
                  Browse <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>

            {/* WORKSPACE TILE 4: UPC SCANNER */}
            <div 
              id="workspace-tile-upc"
              onClick={() => navigate("/upc-scanner")}
              className="group relative bg-black/50 hover:bg-black/70 backdrop-blur-xl border border-white/15 hover:border-cyan-400/50 rounded-2xl p-3 shadow-lg flex flex-col justify-between min-h-[115px] sm:min-h-[125px] cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between h-7">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
                    <Barcode className="w-3.5 h-3.5" />
                  </div>
                  <span className="absolute top-3 right-3 h-[20px] px-1.5 rounded-full inline-flex items-center justify-center text-[8px] font-black uppercase tracking-wider whitespace-nowrap text-cyan-300 bg-cyan-400/10 border border-cyan-400/30 pointer-events-none">
                    Scanner
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white group-hover:text-cyan-300 transition-colors leading-tight">
                    UPC Scanner
                  </h4>
                  <p className="text-[9.5px] text-stone-300 font-medium leading-tight line-clamp-1 mt-0.5">
                    Scan barcodes.
                  </p>
                </div>
              </div>

              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-bold">
                <span className="text-cyan-300 truncate">
                  Instant scan
                </span>
                <span className="text-stone-300 flex items-center gap-0.5 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all shrink-0">
                  Scan <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* 7. SECONDARY COMPACT ACCESS ROW (Favorites & Nutrition) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full">
          <button
            onClick={() => navigate("/favorites")}
            className="group flex items-center justify-between px-3.5 py-2 rounded-xl bg-black/50 hover:bg-black/70 border border-white/15 hover:border-rose-400/50 text-stone-200 text-xs font-bold backdrop-blur-xl transition-all hover:-translate-y-0.5 cursor-pointer shadow-md"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform shrink-0">
                <Heart className="w-3.5 h-3.5 fill-rose-400/30" />
              </div>
              <span className="truncate">Saved Favorites</span>
            </div>
            <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-rose-300 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          <button
            onClick={() => navigate("/nutrition")}
            className="group flex items-center justify-between px-3.5 py-2 rounded-xl bg-black/50 hover:bg-black/70 border border-white/15 hover:border-purple-400/50 text-stone-200 text-xs font-bold backdrop-blur-xl transition-all hover:-translate-y-0.5 cursor-pointer shadow-md"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform shrink-0">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Nutrition &amp; Macros</span>
            </div>
            <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 bg-black/60 backdrop-blur-md border-t border-white/10 text-stone-400 py-2.5 shrink-0">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-[11px] font-bold tracking-wider drop-shadow-xs text-stone-300">
            © 2026 Curation Kitchen • Unified Culinary Search &amp; Workspace
          </p>
        </div>
      </footer>

      {/* DYNAMIC PRO UPGRADE FLOW MODAL */}
      <UpgradeFlowModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentTier={userSub?.subscription_tier || (userSub?.is_premium ? "premium" : "free")}
      />
    </div>
  );
}

export default RecipeDashboard;
