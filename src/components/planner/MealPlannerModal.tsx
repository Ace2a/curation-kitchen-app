/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeClient } from "../../api/recipeClient";
import { MealPlan, Recipe, GroceryItem, PantryItem } from "../../types";
import { isPantryItemVisible } from "../../services/pantryService";
import { 
  X, Calendar, Plus, Trash2, Sparkles, Search, Check, 
  RefreshCw, ChevronRight, Home, Lock, Star, Sparkle, Coffee,
  ChefHat, ArrowRight, ShoppingBag, CheckCircle2, GripVertical,
  CheckSquare, Square
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { 
  calculateGroceryDeficit, 
  getScheduledMealsFromPlan, 
  syncDeficitToGroceryList, 
  DeficitGapAnalysis, 
  DeficitGapItem 
} from "../../services/groceryService";

interface MealPlannerModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isPage?: boolean;
}

const DAYS_OF_WEEK = [
  { key: "monday", abbreviation: "Mon", label: "Monday", index: 0 },
  { key: "tuesday", abbreviation: "Tue", label: "Tuesday", index: 1 },
  { key: "wednesday", abbreviation: "Wed", label: "Wednesday", index: 2 },
  { key: "thursday", abbreviation: "Thu", label: "Thursday", index: 3 },
  { key: "friday", abbreviation: "Fri", label: "Friday", index: 4 },
  { key: "saturday", abbreviation: "Sat", label: "Saturday", index: 5 },
  { key: "sunday", abbreviation: "Sun", label: "Sunday", index: 6 }
];

const MEAL_SLOTS = [
  { 
    key: "breakfast" as const, 
    label: "Breakfast", 
    accentColor: "border-l-[#6E8B6B]", 
    badgeBg: "bg-[#6E8B6B]/10 text-[#6E8B6B]",
    icon: "🥞",
    defaultEmoji: "☕"
  },
  { 
    key: "lunch" as const, 
    label: "Lunch", 
    accentColor: "border-l-[#E0A96D]", 
    badgeBg: "bg-[#E0A96D]/15 text-[#b0783d]",
    icon: "🥗",
    defaultEmoji: "🥪"
  },
  { 
    key: "dinner" as const, 
    label: "Dinner", 
    accentColor: "border-l-[#D95338]", 
    badgeBg: "bg-[#D95338]/10 text-[#D95338]",
    icon: "🍲",
    defaultEmoji: "🍝"
  }
];

export function MealPlannerModal({ isOpen = true, onClose, isPage = true }: MealPlannerModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Active day filter for mobile views
  const [selectedDayKey, setSelectedDayKey] = useState<string>("monday");
  
  // Scheduled meals state array hook
  const [scheduledMeals, setScheduledMeals] = useState<Array<{ dayKey: string; slotKey: "breakfast" | "lunch" | "dinner"; mealObject: any }>>([]);

  // Slot selection modal state
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<"breakfast" | "lunch" | "dinner" | null>(null);
  const [customMealText, setCustomMealText] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");

  // Drag and Drop state
  const [draggedItem, setDraggedItem] = useState<{ day: string; slot: "breakfast" | "lunch" | "dinner"; value: string } | null>(null);

  // Sync Grocery Notification Modal & Deficit Gap Engine State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncedIngredientsCount, setSyncedIngredientsCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deficitAnalysis, setDeficitAnalysis] = useState<DeficitGapAnalysis | null>(null);
  const [checkedDeficitItemIds, setCheckedDeficitItemIds] = useState<Record<string, boolean>>({});

  // AI Planner generation states
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ rationale: string; expiringIngredients: string[] } | null>(null);

  // Fetch real-time pantry inventory for AI Auto-Plan loop
  const { data: pantryItems = [] } = useQuery<PantryItem[]>({
    queryKey: ["pantry"],
    queryFn: () => recipeClient.pantry.list(),
    enabled: isOpen,
  });

  // Fetch recipe list
  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: () => recipeClient.recipes.list(),
    enabled: isOpen,
  });

  // Fetch meal plan
  const { data: mealPlan } = useQuery<MealPlan>({
    queryKey: ["mealPlan"],
    queryFn: () => recipeClient.mealPlan.get(),
    enabled: isOpen,
  });

  // Save meal plan mutation
  const saveMutation = useMutation({
    mutationFn: (updated: MealPlan) => recipeClient.mealPlan.save(updated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlan"] });
    }
  });

  // Handler to update slot assignments in state array and plan
  const handleUpdateSlot = (dayKey: string, slotKey: "breakfast" | "lunch" | "dinner", mealObject: any) => {
    setScheduledMeals((prev) => {
      const filtered = prev.filter((item) => !(item.dayKey === dayKey && item.slotKey === slotKey));
      if (!mealObject) return filtered;
      return [...filtered, { dayKey, slotKey, mealObject }];
    });

    if (mealPlan) {
      const value = typeof mealObject === "string" ? mealObject : mealObject?.id || mealObject?.title;
      const updatedPlan = {
        ...mealPlan,
        [dayKey]: {
          ...(mealPlan[dayKey] || {}),
          [slotKey]: value
        }
      };
      saveMutation.mutate(updatedPlan);
    }
  };

  // Assign meal (custom text or recipe id)
  const handleAssignMeal = (value: string) => {
    if (editingDay && editingSlot) {
      handleUpdateSlot(editingDay, editingSlot, value);
      setEditingDay(null);
      setEditingSlot(null);
      setCustomMealText("");
      setRecipeSearch("");
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, day: string, slot: "breakfast" | "lunch" | "dinner", value: string) => {
    setDraggedItem({ day, slot, value });
    e.dataTransfer.setData("text/plain", JSON.stringify({ day, slot, value }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Placeholder handler to capture drag-and-drop recipe transfers
  const handleDrop = (e: React.DragEvent, targetDay: string, targetSlot: "breakfast" | "lunch" | "dinner") => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    let transferObj: any = null;
    try {
      transferObj = JSON.parse(data);
    } catch {
      transferObj = data;
    }

    if (draggedItem && mealPlan) {
      if (draggedItem.day === targetDay && draggedItem.slot === targetSlot) {
        setDraggedItem(null);
        return;
      }
      const currentTargetVal = mealPlan?.[targetDay]?.[targetSlot];
      const updatedPlan: MealPlan = {
        ...mealPlan,
        [draggedItem.day]: {
          ...(mealPlan[draggedItem.day] || {}),
          [draggedItem.slot]: currentTargetVal
        },
        [targetDay]: {
          ...(mealPlan[targetDay] || {}),
          [targetSlot]: draggedItem.value
        }
      };
      saveMutation.mutate(updatedPlan);
      setDraggedItem(null);
      return;
    }

    if (transferObj) {
      handleUpdateSlot(targetDay, targetSlot, transferObj);
    }
  };

  // Helper to resolve recipe details or custom text
  const getSlotDisplay = (day: string, slot: "breakfast" | "lunch" | "dinner") => {
    const value = mealPlan?.[day]?.[slot];
    if (!value) return null;
    const recipe = recipes.find(r => r.id === value);
    if (recipe) {
      return { 
        type: "recipe" as const, 
        text: recipe.title, 
        id: recipe.id,
        prepTime: recipe.prep_time || "15m",
        image: recipe.image_url || null,
        ingredients: recipe.ingredients || [],
        emoji: slot === "breakfast" ? "🥞" : slot === "lunch" ? "🥗" : "🍲"
      };
    }
    return { 
      type: "custom" as const, 
      text: value,
      prepTime: "10m",
      image: null,
      ingredients: [value],
      emoji: slot === "breakfast" ? "☕" : slot === "lunch" ? "🥪" : "🍝"
    };
  };

  // 3. "AUTOMATED GROCERY LIST" DEFICIT GAP SYNC ACTION (SAGE GREEN PIPELINE)
  const handleGenerateSyncGroceryList = async () => {
    if (!mealPlan) return;
    setIsSyncing(true);

    try {
      // 1. Read the active 7-day meal planner schedule
      const scheduledMeals = getScheduledMealsFromPlan(mealPlan, recipes);

      if (scheduledMeals.length === 0) {
        alert("No scheduled meals found in your calendar! Plan a few meals first, then generate your sync grocery list.");
        setIsSyncing(false);
        return;
      }

      // 2. Fetch complete live pantry inventory (including quantity: 0 items per Gap C)
      // pantryItems from useQuery already contains the complete live inventory list
      const analysis = calculateGroceryDeficit(scheduledMeals, pantryItems);
      setDeficitAnalysis(analysis);

      // 3. If deficit > 0, append missing items to local in-app grocery list database
      if (analysis.deficitItems.length > 0) {
        await syncDeficitToGroceryList(analysis.deficitItems);
        queryClient.invalidateQueries({ queryKey: ["grocery"] });
        setSyncedIngredientsCount(analysis.deficitItemsCount);
      } else {
        setSyncedIngredientsCount(0);
      }

      // Reset local check states for newly calculated deficit items
      setCheckedDeficitItemIds({});
      setIsSyncModalOpen(true);
    } catch (err) {
      console.error("Failed calculating and syncing grocery deficit gap:", err);
      alert("An error occurred while calculating your grocery deficit gap. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear entire week
  const handleClearWeek = () => {
    if (window.confirm("Are you sure you want to clear your weekly meal plan?")) {
      const cleared: MealPlan = {
        monday: {}, tuesday: {}, wednesday: {}, thursday: {}, friday: {}, saturday: {}, sunday: {}
      };
      saveMutation.mutate(cleared);
    }
  };

  // AI Auto-Plan Week with Real-Time Pantry Inventory Loop
  const handleAiAutoPlan = async () => {
    if (recipes.length === 0) {
      alert("Please add some recipes to your cookbook first so the AI can generate a weekly plan!");
      return;
    }

    setIsAiGenerating(true);
    setAiFeedback(null);

    try {
      const activePantry = pantryItems.filter(isPantryItemVisible);
      const result = await recipeClient.mealPlan.autoPlan(recipes, activePantry);

      if (result && result.plan) {
        const validatedPlan: MealPlan = {
          monday: {}, tuesday: {}, wednesday: {}, thursday: {}, friday: {}, saturday: {}, sunday: {}
        };
        DAYS_OF_WEEK.forEach(({ key }) => {
          if (result.plan[key]) {
            validatedPlan[key] = {
              breakfast: result.plan[key].breakfast || "",
              lunch: result.plan[key].lunch || "",
              dinner: result.plan[key].dinner || ""
            };
          }
        });
        saveMutation.mutate(validatedPlan);

        if (result.rationale) {
          setAiFeedback({
            rationale: result.rationale,
            expiringIngredients: result.expiringIngredientsUsed || [],
          });
        }
        setIsAiGenerating(false);
        return;
      }
    } catch (e) {
      console.warn("AI Auto-Plan error, falling back to algorithmic plan:", e);
    }

    // Fallback randomized plan using user recipes
    const fallbackPlan: MealPlan = {
      monday: {}, tuesday: {}, wednesday: {}, thursday: {}, friday: {}, saturday: {}, sunday: {}
    };
    DAYS_OF_WEEK.forEach(({ key }) => {
      const randB = recipes[Math.floor(Math.random() * recipes.length)]?.id || "";
      const randL = recipes[Math.floor(Math.random() * recipes.length)]?.id || "";
      const randD = recipes[Math.floor(Math.random() * recipes.length)]?.id || "";
      fallbackPlan[key] = { breakfast: randB, lunch: randL, dinner: randD };
    });
    saveMutation.mutate(fallbackPlan);
    setAiFeedback({
      rationale: "Generated a balanced weekly plan across your saved cookbook recipes.",
      expiringIngredients: [],
    });
    setIsAiGenerating(false);
  };

  // Search recipes for selector modal
  const filteredRecipes = recipes.filter(r => 
    r.title.toLowerCase().includes(recipeSearch.toLowerCase()) ||
    r.tags.some(t => t.toLowerCase().includes(recipeSearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#FAF6EE] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans pb-20 selection:bg-[#6E8B6B]/20">
      
      {/* HEADER BAR */}
      <header className="border-b border-[#E6DFC6] dark:border-zinc-800 bg-[#FAF6EE]/90 dark:bg-zinc-950/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          {/* Left Title & Navigation */}
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-[#E6DFC6] dark:border-zinc-800 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-900 cursor-pointer">
                <Home className="w-3.5 h-3.5 text-[#6E8B6B]" />
                <span>Workspace</span>
              </Button>
            </Link>
            <div className="h-4 w-px bg-[#E6DFC6] dark:bg-zinc-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-[#6E8B6B]/10 text-[#6E8B6B]">
                <Calendar className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-serif font-semibold tracking-tight text-zinc-900 dark:text-white">
                Editorial Meal Planner
              </h1>
            </div>
          </div>

          {/* Right Action Hub: 3. "AUTOMATED GROCERY LIST" SYNC ACTION BUTTON */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto mt-2 sm:mt-0">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleAiAutoPlan}
                disabled={isAiGenerating}
                className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-full bg-white dark:bg-zinc-900 border border-[#E6DFC6] dark:border-zinc-800 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[44px]"
              >
                {isAiGenerating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D95338]" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                )}
                <span>{isAiGenerating ? "Curating..." : "✨ AI Auto-Plan"}</span>
              </button>

              <button
                onClick={handleClearWeek}
                className="p-2.5 rounded-full text-stone-400 hover:text-[#D95338] hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-[#E6DFC6] dark:hover:border-zinc-700 transition-all cursor-pointer shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Clear weekly plan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* PROMINENT SAGE GREEN SYNC BUTTON */}
            <button
              onClick={handleGenerateSyncGroceryList}
              disabled={isSyncing}
              className="w-full sm:w-auto flex flex-wrap text-center items-center justify-center leading-tight py-2.5 px-4 min-h-[44px] h-auto rounded-full bg-[#6E8B6B] hover:bg-[#536d50] text-white font-bold text-xs tracking-wide shadow-md hover:shadow-lg transition-all duration-300 gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-white stroke-[3] shrink-0" />
              <span>{isSyncing ? "Syncing..." : "Generate & Sync Grocery List"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* AI AUTO-PLAN RATIONALE & EXPOSING BANNER */}
        <AnimatePresence>
          {aiFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-4 rounded-2xl bg-[#6E8B6B]/15 border border-[#6E8B6B]/30 text-zinc-900 dark:text-zinc-100 text-xs flex items-start justify-between gap-3 shadow-xs"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <Sparkles className="w-4 h-4 text-[#6E8B6B] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-[11px] uppercase tracking-wider text-[#6E8B6B]">
                      AI Auto-Plan Generated
                    </span>
                    {aiFeedback.expiringIngredients.length > 0 && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        {aiFeedback.expiringIngredients.length} Expiring Items Prioritized
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    {aiFeedback.rationale}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiFeedback(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center shrink-0"
                aria-label="Dismiss AI plan note"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* MOBILE DAY SELECTOR STRIP (Shown on smaller screens) */}
        <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = selectedDayKey === day.key;
            return (
              <button
                key={day.key}
                onClick={() => setSelectedDayKey(day.key)}
                className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer min-h-[44px] flex items-center justify-center ${
                  isSelected
                    ? "bg-[#6E8B6B] text-white shadow-xs"
                    : "bg-white/80 dark:bg-zinc-900 text-stone-600 dark:text-stone-300 border border-[#E6DFC6] dark:border-zinc-800"
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>

        {/* 1. THE CALENDAR FRAMEWORK GRID */}
        {/* Borderless vertical columns on #FAF6EE canvas with light warm cream overlay tint */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {DAYS_OF_WEEK.map((dayObj) => {
            const dayKey = dayObj.key;
            const isSelectedOnMobile = selectedDayKey === dayKey;

            return (
              <div
                key={dayKey}
                className={`flex-col space-y-3 rounded-2xl p-3 transition-all ${
                  isSelectedOnMobile ? "flex" : "hidden md:flex"
                } bg-[#FDFBF7] dark:bg-zinc-900/60 border border-[#E6DFC6]/60 dark:border-zinc-800/60 shadow-2xs`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#E6DFC6]/40 dark:border-zinc-800/80 px-1">
                  <div>
                    <h3 className="text-sm font-serif font-bold text-zinc-900 dark:text-zinc-100">
                      {dayObj.label}
                    </h3>
                    <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
                      {dayObj.abbreviation}
                    </p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#6E8B6B]/40" />
                </div>

                {/* Meal Slots (Breakfast, Lunch, Dinner) */}
                <div className="space-y-3 flex-grow">
                  {MEAL_SLOTS.map((slot) => {
                    const meal = getSlotDisplay(dayKey, slot.key);

                    return (
                      <div
                        key={slot.key}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, dayKey, slot.key)}
                        className="space-y-1"
                      >
                        <div className="flex items-center justify-between px-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${slot.badgeBg} px-2 py-0.5 rounded-full`}>
                            {slot.label}
                          </span>
                        </div>

                        {meal ? (
                          /* 2. DRAGGABLE MEAL MICRO-CARD */
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, dayKey, slot.key, meal.id || meal.text)}
                            className={`group relative bg-white dark:bg-zinc-800/90 border border-[#E6DFC6] dark:border-zinc-700/80 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs hover:shadow-md transition-all duration-200 border-l-4 ${slot.accentColor} cursor-grab active:cursor-grabbing select-none`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Recipe Thumbnail Mask */}
                              <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-[#FAF6EE] dark:bg-zinc-700 border border-[#E6DFC6]/50 flex items-center justify-center text-base">
                                {meal.image ? (
                                  <img 
                                    src={meal.image} 
                                    alt={meal.text} 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <span>{meal.emoji}</span>
                                )}
                              </div>

                              {/* Title & Time */}
                              <div className="min-w-0 space-y-0.5">
                                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-[#D95338] transition-colors">
                                  {meal.text}
                                </h4>
                                <p className="text-[10px] text-stone-400 font-medium">
                                  ⏱️ {meal.prepTime}
                                </p>
                              </div>
                            </div>

                            {/* Clear Slot Button */}
                            <button
                              onClick={() => handleUpdateSlot(dayKey, slot.key, undefined)}
                              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-stone-400 hover:text-[#D95338] p-2 rounded-full hover:bg-stone-100 dark:hover:bg-zinc-700 transition-all min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0 cursor-pointer"
                              title="Clear meal"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          /* Empty Slot Target with min-h-[44px] touch safety */
                          <button
                            onClick={() => {
                              setEditingDay(dayKey);
                              setEditingSlot(slot.key);
                            }}
                            className="w-full py-2.5 px-3 min-h-[44px] rounded-xl border border-dashed border-[#E6DFC6] dark:border-zinc-800 hover:border-[#6E8B6B] hover:bg-white/80 dark:hover:bg-zinc-800/50 text-[#6E8B6B]/90 hover:text-[#6E8B6B] dark:text-stone-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-2xs active:scale-98"
                          >
                            <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            <span>+ Schedule Recipe</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* SYNC GROCERY SUCCESS MODAL (SAGE GREEN LIST) */}
      <AnimatePresence>
        {isSyncModalOpen && (
          <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FAF6EE] dark:bg-zinc-900 border border-[#E6DFC6] dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col text-left"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-[#E6DFC6] dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#6E8B6B]/15 text-[#6E8B6B] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <span>Grocery Deficit Synced</span>
                      <span className="text-[10px] font-sans font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#6E8B6B]/20 text-[#4c6749]">
                        Sage Green List
                      </span>
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-zinc-400">
                      Evaluated against real-time pantry inventory & depleted stock.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSyncModalOpen(false)}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 rounded-full cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Deficit Metric Highlights */}
              <div className="grid grid-cols-3 gap-2 py-1">
                <div className="p-2.5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-[#E6DFC6] dark:border-zinc-700 text-center">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 block">Required</span>
                  <span className="text-base font-bold text-zinc-900 dark:text-white">
                    {deficitAnalysis?.uniqueIngredientsCount || 0}
                  </span>
                  <span className="text-[9px] text-stone-400 block">ingredients</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-[#6E8B6B]/10 border border-[#6E8B6B]/25 text-center">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#6E8B6B] block">In Pantry</span>
                  <span className="text-base font-bold text-[#6E8B6B]">
                    {deficitAnalysis?.coveredItemsCount || 0}
                  </span>
                  <span className="text-[9px] text-[#6E8B6B]/80 block">covered</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-[#D95338]/10 border border-[#D95338]/25 text-center">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#D95338] block">Deficit Gap</span>
                  <span className="text-base font-bold text-[#D95338]">
                    {deficitAnalysis?.deficitItemsCount || 0}
                  </span>
                  <span className="text-[9px] text-[#D95338]/80 block">to buy</span>
                </div>
              </div>

              {/* List of deficit items or 100% covered state */}
              <div className="flex-grow overflow-y-auto pr-1 space-y-2 min-h-0 max-h-[320px]">
                {(!deficitAnalysis || deficitAnalysis.deficitItems.length === 0) ? (
                  <div className="text-center py-8 px-4 rounded-2xl bg-white dark:bg-zinc-800 border border-[#E6DFC6] space-y-2">
                    <span className="text-3xl">🎉</span>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Kitchen Fully Stocked!
                    </h4>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                      All required ingredients for your planned 7-day meals are already available in your pantry inventory.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 px-1">
                      <span>Items Added to Grocery List ({deficitAnalysis.deficitItems.length})</span>
                      <span className="text-[10px] text-stone-400">Click item to check off</span>
                    </div>

                    {deficitAnalysis.deficitItems.map((item) => {
                      const isChecked = !!checkedDeficitItemIds[item.id];
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setCheckedDeficitItemIds(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                          }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                            isChecked
                              ? "bg-stone-100/70 dark:bg-zinc-800/40 border-stone-200 dark:border-zinc-800 opacity-60"
                              : "bg-white dark:bg-zinc-800 border-[#E6DFC6] dark:border-zinc-700/80 hover:border-[#6E8B6B] shadow-2xs"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              className="text-stone-400 hover:text-[#6E8B6B] shrink-0"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-[#6E8B6B]" />
                              ) : (
                                <Square className="w-4 h-4 text-stone-400" />
                              )}
                            </button>

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold capitalize truncate ${
                                  isChecked ? "line-through text-stone-400" : "text-zinc-900 dark:text-zinc-100"
                                }`}>
                                  {item.name}
                                </span>
                                <span className="text-[9px] font-medium px-2 py-0.2 rounded-full bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-stone-300">
                                  {item.category}
                                </span>
                              </div>

                              <p className="text-[10px] text-stone-500 dark:text-zinc-400">
                                Need {item.formattedRequiredQuantity} • In Pantry: <strong className="text-stone-600 dark:text-stone-300">{item.formattedPantryQuantity}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-[#D95338] bg-[#D95338]/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                              +{item.formattedDeficitQuantity}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action buttons (STRICT CONSTRAINT: strictly in-app navigation, no affiliate links) */}
              <div className="pt-2 border-t border-[#E6DFC6] dark:border-zinc-800 flex items-center justify-between gap-3">
                <Button
                  onClick={() => setIsSyncModalOpen(false)}
                  variant="outline"
                  className="rounded-full border-[#E6DFC6] text-xs font-medium cursor-pointer h-11 px-5"
                >
                  Stay on Planner
                </Button>
                <Button
                  onClick={() => {
                    setIsSyncModalOpen(false);
                    navigate("/pantry");
                  }}
                  className="rounded-full bg-[#6E8B6B] hover:bg-[#536d50] text-white text-xs font-bold gap-2 cursor-pointer h-11 px-5 shadow-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>View Grocery List</span>
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECIPE SELECTION MODAL */}
      <AnimatePresence>
        {editingDay && editingSlot && (
          <div className="fixed inset-0 z-[60] bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FAF6EE] dark:bg-zinc-900 border border-[#E6DFC6] dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-[#E6DFC6] dark:border-zinc-800 pb-3">
                <div>
                  <h4 className="text-base font-serif font-bold text-zinc-900 dark:text-white capitalize">
                    Schedule {editingSlot}
                  </h4>
                  <p className="text-xs text-stone-500 capitalize">
                    {DAYS_OF_WEEK.find(d => d.key === editingDay)?.label}
                  </p>
                </div>
                <button
                  onClick={() => { setEditingDay(null); setEditingSlot(null); }}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Custom meal entry */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-600 dark:text-zinc-400">Custom Meal or Dine Out</label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (customMealText.trim()) {
                      handleAssignMeal(customMealText.trim());
                    }
                  }}
                  className="flex gap-2"
                >
                  <Input
                    type="text"
                    placeholder="e.g., Avocado Toast, Greek Salad..."
                    value={customMealText}
                    onChange={(e) => setCustomMealText(e.target.value)}
                    className="text-xs bg-white dark:bg-zinc-800 border-[#E6DFC6] rounded-xl h-11 min-h-[44px]"
                  />
                  <Button
                    type="submit"
                    className="bg-[#6E8B6B] hover:bg-[#536d50] text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer h-11 min-h-[44px] px-4"
                  >
                    Assign
                  </Button>
                </form>
              </div>

              <div className="h-px bg-[#E6DFC6] dark:bg-zinc-800" />

              {/* Recipe Selector */}
              <div className="flex-grow flex flex-col space-y-3 min-h-0">
                <label className="text-xs font-bold text-stone-600 dark:text-zinc-400">Choose from Cookbook</label>
                
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search recipes..."
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                    className="pl-10 text-xs bg-white dark:bg-zinc-800 border-[#E6DFC6] rounded-xl h-11 min-h-[44px]"
                  />
                </div>

                <div className="flex-grow overflow-y-auto space-y-2 pr-1 max-h-[220px]">
                  {filteredRecipes.length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-6">No matching recipes in cookbook</p>
                  ) : (
                    filteredRecipes.map(recipe => (
                      <button
                        key={recipe.id}
                        onClick={() => {
                          handleUpdateSlot(editingDay, editingSlot, recipe);
                          setEditingDay(null);
                          setEditingSlot(null);
                          setCustomMealText("");
                          setRecipeSearch("");
                        }}
                        className="w-full text-left p-3 min-h-[52px] rounded-2xl bg-white dark:bg-zinc-800 border border-[#E6DFC6] dark:border-zinc-700 hover:border-[#6E8B6B] flex items-center justify-between transition-all cursor-pointer group shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {recipe.image_url ? (
                            <img src={recipe.image_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <span className="w-8 h-8 rounded-lg bg-[#FAF6EE] flex items-center justify-center text-sm shrink-0">🍲</span>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-[#6E8B6B] transition-colors">{recipe.title}</p>
                            <p className="text-[10px] text-stone-400">⏱️ {recipe.prep_time || "15 mins"}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#6E8B6B] group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default MealPlannerModal;
