/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { 
  Plus, Trash2, Calendar, ChevronLeft, ChevronRight, Sparkles, 
  Settings, Check, X, ShieldAlert, Award, TrendingUp, Info, ArrowLeft, Loader2, HelpCircle, Home
} from "lucide-react";
import { recipeClient } from "../../api/recipeClient";
import { KitchenLogo } from "../ui/KitchenLogo";
import { Recipe, NutritionGoals, NutritionLog, RecipeNutrition } from "../../types";

const GOVERNMENT_RECOMMENDATIONS: Record<string, {
  name: string;
  flag: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium: number;
  source: string;
}> = {
  CA: {
    name: "Canada (Health Canada Baseline)",
    flag: "🇨🇦",
    calories: 2000,
    protein: 56,
    carbs: 225,
    fat: 65,
    sodium: 2300,
    source: "Health Canada Dietary Reference Intakes (DRI)"
  },
  US: {
    name: "United States (USDA)",
    flag: "🇺🇸",
    calories: 2000,
    protein: 50,
    carbs: 275,
    fat: 70,
    sodium: 2300,
    source: "USDA Dietary Guidelines for Americans"
  },
  WHO: {
    name: "International (WHO)",
    flag: "🌐",
    calories: 2000,
    protein: 50,
    carbs: 275,
    fat: 65,
    sodium: 2000,
    source: "World Health Organization Guidelines"
  }
};

// Auto-detector with Canada (Health Canada Guidelines) as default baseline
function detectCountryCode(): string {
  if (typeof Intl === "undefined" || !Intl.DateTimeFormat) return "CA";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const locale = navigator.language || "";
    
    if (tz.includes("America/") || tz.includes("US/")) return "US";
    if (tz.includes("Canada/") || locale.includes("en-CA") || locale.includes("fr-CA")) return "CA";
  } catch {
    // Fail silently
  }
  return "CA";
}

export default function NutritionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Track selected logging date (default to today)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  
  // Local toggles & UI controls
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [activeLogTab, setActiveLogTab] = useState<"recipe" | "custom">("recipe");
  
  // Custom manual logging state
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState("350");
  const [customProtein, setCustomProtein] = useState("15");
  const [customCarbs, setCustomCarbs] = useState("40");
  const [customFat, setCustomFat] = useState("10");
  const [customSodium, setCustomSodium] = useState("350");
  const [customServings, setCustomServings] = useState("1");

  // Recipe selection state
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [recipeServings, setRecipeServings] = useState("1");
  const [isEstimating, setIsEstimating] = useState<string | null>(null);

  // Load Queries
  const { data: recipes = [], isLoading: isLoadingRecipes } = useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: () => recipeClient.recipes.list("-created_date"),
  });

  const { data: goals, isLoading: isLoadingGoals } = useQuery<NutritionGoals>({
    queryKey: ["nutritionGoals"],
    queryFn: recipeClient.nutrition.getGoals,
  });

  const { data: logs = [], isLoading: isLoadingLogs } = useQuery<NutritionLog[]>({
    queryKey: ["nutritionLogs", selectedDate],
    queryFn: () => recipeClient.nutrition.listLogs(selectedDate),
  });

  // Mutate Goals
  const updateGoalsMutation = useMutation({
    mutationFn: recipeClient.nutrition.saveGoals,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutritionGoals"] });
      setShowGoalSettings(false);
    }
  });

  // Mutate Logs
  const createLogMutation = useMutation({
    mutationFn: recipeClient.nutrition.createLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutritionLogs", selectedDate] });
      // Reset forms
      setCustomName("");
      setSelectedRecipeId("");
    }
  });

  const deleteLogMutation = useMutation({
    mutationFn: recipeClient.nutrition.deleteLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutritionLogs", selectedDate] });
    }
  });

  const clearLogsMutation = useMutation({
    mutationFn: () => recipeClient.nutrition.clearLogsForDate(selectedDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutritionLogs", selectedDate] });
      setShowResetDialog(false);
    }
  });

  // Recipe updating mutation (to persist nutrition info directly inside the recipe in the library)
  const updateRecipeMutation = useMutation({
    mutationFn: (args: { id: string; nutrition: RecipeNutrition }) => {
      const rec = recipes.find(r => r.id === args.id);
      if (!rec) throw new Error("Recipe not found");
      return recipeClient.recipes.update(args.id, {
        ...rec,
        nutrition: args.nutrition
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    }
  });

  // Detect and auto-fill defaults on settings load
  const currentGoals = useMemo(() => {
    if (goals) return goals;
    const autoCountry = detectCountryCode();
    const countryRec = GOVERNMENT_RECOMMENDATIONS[autoCountry];
    return {
      useGovernment: true,
      country: autoCountry,
      customCalories: countryRec.calories,
      customProtein: countryRec.protein,
      customCarbs: countryRec.carbs,
      customFat: countryRec.fat,
      customSodium: countryRec.sodium
    };
  }, [goals]);

  // Derive target nutrient targets
  const targets = useMemo(() => {
    if (currentGoals.useGovernment) {
      const rec = GOVERNMENT_RECOMMENDATIONS[currentGoals.country] || GOVERNMENT_RECOMMENDATIONS.WHO;
      return {
        calories: rec.calories,
        protein: rec.protein,
        carbs: rec.carbs,
        fat: rec.fat,
        sodium: rec.sodium,
        name: rec.name,
        flag: rec.flag,
        source: rec.source
      };
    }
    return {
      calories: currentGoals.customCalories,
      protein: currentGoals.customProtein,
      carbs: currentGoals.customCarbs,
      fat: currentGoals.customFat,
      sodium: currentGoals.customSodium,
      name: "Your Custom Goals",
      flag: "🎯",
      source: "Self-defined goals"
    };
  }, [currentGoals]);

  // Compute Daily Totals
  const totals = useMemo(() => {
    let cal = 0, pro = 0, carb = 0, fat = 0, sod = 0;
    logs.forEach(log => {
      const multiplier = log.servings || 1;
      cal += (log.calories || 0) * multiplier;
      pro += (log.protein || 0) * multiplier;
      carb += (log.carbs || 0) * multiplier;
      fat += (log.fat || 0) * multiplier;
      sod += (log.sodium || 0) * multiplier;
    });
    return {
      calories: Math.round(cal),
      protein: Math.round(pro),
      carbs: Math.round(carb),
      fat: Math.round(fat),
      sodium: Math.round(sod)
    };
  }, [logs]);

  // Format single date prettily
  const formattedDateLabel = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (selectedDate === today) return "Today";
    if (selectedDate === yesterday) return "Yesterday";
    
    const parts = selectedDate.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }
    return selectedDate;
  }, [selectedDate]);

  // Adjust date helper
  const changeDate = (days: number) => {
    const parts = selectedDate.split("-");
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // Estimate nutrition helper
  const handleEstimateRecipeNutrition = async (id: string) => {
    const rec = recipes.find(r => r.id === id);
    if (!rec) return;
    setIsEstimating(id);
    try {
      const estimated = await recipeClient.nutrition.estimateRecipe(rec.title, rec.ingredients, rec.servings);
      await updateRecipeMutation.mutateAsync({ id, nutrition: estimated });
    } catch (err) {
      console.error("Failed to estimate nutrition facts:", err);
    } finally {
      setIsEstimating(null);
    }
  };

  // Handle logging select recipe
  const handleLogRecipe = () => {
    if (!selectedRecipeId) return;
    const rec = recipes.find(r => r.id === selectedRecipeId);
    if (!rec) return;

    if (!rec.nutrition) {
      // Recipe has no nutrition! Let's auto-estimate first
      handleEstimateRecipeNutrition(rec.id).then(() => {
        // Fetch estimated version to log
        const updatedRec = queryClient.getQueryData<Recipe[]>(["recipes"])?.find(r => r.id === selectedRecipeId) || rec;
        const nut = updatedRec.nutrition || { calories: 350, protein: 12, carbs: 40, fat: 12, sodium: 450 };
        createLogMutation.mutate({
          name: updatedRec.title,
          recipeId: updatedRec.id,
          calories: nut.calories,
          protein: nut.protein,
          carbs: nut.carbs,
          fat: nut.fat,
          sodium: nut.sodium,
          servings: parseFloat(recipeServings) || 1,
          date: selectedDate
        });
      });
    } else {
      createLogMutation.mutate({
        name: rec.title,
        recipeId: rec.id,
        calories: rec.nutrition.calories,
        protein: rec.nutrition.protein,
        carbs: rec.nutrition.carbs,
        fat: rec.nutrition.fat,
        sodium: rec.nutrition.sodium,
        servings: parseFloat(recipeServings) || 1,
        date: selectedDate
      });
    }
  };

  // Handle manual logging
  const handleLogCustom = () => {
    if (!customName.trim()) return;
    createLogMutation.mutate({
      name: customName.trim(),
      calories: parseInt(customCalories) || 0,
      protein: parseInt(customProtein) || 0,
      carbs: parseInt(customCarbs) || 0,
      fat: parseInt(customFat) || 0,
      sodium: parseInt(customSodium) || 0,
      servings: parseFloat(customServings) || 1,
      date: selectedDate
    });
  };

  const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);

  // Dynamic values for target-setting form state
  const [editUseGov, setEditUseGov] = useState(currentGoals.useGovernment);
  const [editCountry, setEditCountry] = useState(currentGoals.country);
  const [editCal, setEditCal] = useState(currentGoals.customCalories.toString());
  const [editPro, setEditPro] = useState(currentGoals.customProtein.toString());
  const [editCarb, setEditCarb] = useState(currentGoals.customCarbs.toString());
  const [editFatVal, setEditFatVal] = useState(currentGoals.customFat.toString());
  const [editSod, setEditSod] = useState(currentGoals.customSodium.toString());

  // Initialize editing state on opening settings
  const openGoalSettings = () => {
    setEditUseGov(currentGoals.useGovernment);
    setEditCountry(currentGoals.country);
    setEditCal(currentGoals.customCalories.toString());
    setEditPro(currentGoals.customProtein.toString());
    setEditCarb(currentGoals.customCarbs.toString());
    setEditFatVal(currentGoals.customFat.toString());
    setEditSod(currentGoals.customSodium.toString());
    setShowGoalSettings(true);
  };

  const handleSaveGoalSettings = () => {
    updateGoalsMutation.mutate({
      useGovernment: editUseGov,
      country: editCountry,
      customCalories: parseInt(editCal) || 2000,
      customProtein: parseInt(editPro) || 56,
      customCarbs: parseInt(editCarb) || 225,
      customFat: parseInt(editFatVal) || 65,
      customSodium: parseInt(editSod) || 2300
    });
  };

  // Calculate percentage matching styles with Sage Green for success/goals and Terracotta Orange for warning limits
  const getPercentageInfo = (current: number, target: number, isLimit = false) => {
    const pct = target > 0 ? Math.round((current / target) * 100) : 0;
    const isExceeded = pct > 100;
    
    // For limits (calories, sodium): >100% is warning/exceeded (Terracotta Orange)
    // For goals (protein, carbs, fat): Sage Green represents success / healthy progress
    let color = "bg-[#6E8B6B]";
    let textClass = "text-[#6E8B6B]";
    let badgeClass = "bg-[#6E8B6B]/15 text-[#6E8B6B] border border-[#6E8B6B]/30";
    
    if (isLimit && isExceeded) {
      color = "bg-[#D95338]";
      textClass = "text-[#D95338]";
      badgeClass = "bg-[#D95338]/15 text-[#D95338] border border-[#D95338]/30";
    } else if (!isLimit && pct >= 100) {
      color = "bg-[#6E8B6B]";
      textClass = "text-[#6E8B6B]";
      badgeClass = "bg-[#6E8B6B]/20 text-[#6E8B6B] border border-[#6E8B6B]/40";
    }

    return { pct, color, textClass, badgeClass, isExceeded };
  };

  const calorieInfo = getPercentageInfo(totals.calories, targets.calories, true);
  const proteinInfo = getPercentageInfo(totals.protein, targets.protein, false);
  const carbsInfo = getPercentageInfo(totals.carbs, targets.carbs, false);
  const fatInfo = getPercentageInfo(totals.fat, targets.fat, false);
  const sodiumInfo = getPercentageInfo(totals.sodium, targets.sodium, true);

  return (
    <div className="min-h-screen w-full relative text-zinc-900 flex flex-col font-sans selection:bg-[#D95338]/30 overflow-x-hidden">
      {/* Full-Screen Dark Culinary Wallpaper Layer */}
      <div className="fixed inset-0 z-0 w-full h-full pointer-events-none overflow-hidden bg-zinc-950">
        <img
          src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=2000&q=80"
          alt="Culinary Inspiration Hub Full-Screen Wallpaper"
          className="w-full h-full object-cover object-center transform scale-100"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-black/90 backdrop-blur-[3px]" />
      </div>

      {/* Top Bar Navigation (Dark Glassmorphism) */}
      <header className="sticky top-0 z-40 bg-black/45 backdrop-blur-xl border-b border-white/15 px-3.5 sm:px-6 py-2.5 shadow-xl text-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Left: Home Button */}
          <Link to="/">
            <button
              className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer select-none"
              id="back-home-btn"
            >
              <Home className="w-3.5 h-3.5 text-white/80" />
              <span>Dashboard</span>
            </button>
          </Link>
          
          {/* Center: Title */}
          <div className="flex items-center gap-2">
            <span className="text-base">🥗</span>
            <h1 className="font-serif text-sm sm:text-base font-extrabold tracking-wide text-white">
              Nutrition Tracker
            </h1>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowResetDialog(true)}
              className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-[#D95338] bg-[#D95338]/15 hover:bg-[#D95338]/25 border border-[#D95338]/40 rounded-xl transition-all cursor-pointer"
              id="goals-settings-btn"
              title="Reset Today's Logs"
            >
              Reset Day
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-4 space-y-4">

        {/* GOAL CONFIGURATION DRAWER/MODAL */}
        {showGoalSettings && (
          <div className="bg-[#FAF6EE] text-zinc-900 border border-[#FAF6EE]/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between border-b border-stone-300/70 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#D95338]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900">Configure Intake Targets</h3>
              </div>
              <button 
                onClick={() => setShowGoalSettings(false)}
                className="p-1 hover:bg-stone-200/80 rounded-full text-stone-500 hover:text-zinc-900 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Country Selection Tab */}
              <div className="space-y-4">
                <span className="text-[9px] font-black uppercase tracking-wider text-stone-500 block">Baseline Mode</span>
                <div className="flex bg-stone-200/80 p-1 rounded-xl gap-1 border border-stone-300/60">
                  <button
                    onClick={() => setEditUseGov(true)}
                    className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                      editUseGov 
                        ? "bg-[#FAF6EE] text-[#D95338] shadow-xs" 
                        : "text-stone-600 hover:text-zinc-900"
                    }`}
                  >
                    Govt Guidelines
                  </button>
                  <button
                    onClick={() => setEditUseGov(false)}
                    className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                      !editUseGov 
                        ? "bg-[#FAF6EE] text-[#D95338] shadow-xs" 
                        : "text-stone-600 hover:text-zinc-900"
                    }`}
                  >
                    Custom Goals
                  </button>
                </div>

                {editUseGov ? (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-700 block">Select Region/Country Guideline:</label>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                      {Object.entries(GOVERNMENT_RECOMMENDATIONS).map(([code, rec]) => (
                        <button
                          key={code}
                          onClick={() => setEditCountry(code)}
                          className={`w-full px-3 py-2 border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                            editCountry === code
                              ? "bg-[#D95338]/10 border-[#D95338] text-[#D95338] font-bold shadow-xs"
                              : "bg-white hover:bg-stone-100/70 border-stone-300/80 text-zinc-800"
                          }`}
                        >
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            <span className="text-sm">{rec.flag}</span>
                            <span>{rec.name}</span>
                          </span>
                          <Check className={`w-4 h-4 text-[#D95338] ${editCountry === code ? "opacity-100" : "opacity-0"}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white/80 rounded-2xl border border-dashed border-stone-300 space-y-2">
                    <span className="text-[10px] font-black uppercase text-[#D95338] block">Custom Intake Control</span>
                    <p className="text-[11px] text-stone-600 leading-normal font-medium">
                      Define nutrition targets that suit your personal fitness journey, metabolic rate, or dietary constraints. The recommendations below will update instantly.
                    </p>
                  </div>
                )}
              </div>

              {/* Target values form */}
              <div className="space-y-4">
                <span className="text-[9px] font-black uppercase tracking-wider text-stone-500 block">Daily Intake Targets</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-stone-600 uppercase">Calories (kcal)</label>
                    <input
                      type="number"
                      disabled={editUseGov}
                      value={editUseGov ? GOVERNMENT_RECOMMENDATIONS[editCountry]?.calories || 2000 : editCal}
                      onChange={(e) => setEditCal(e.target.value)}
                      className="w-full px-3 py-2 bg-white disabled:bg-stone-100 border border-stone-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#D95338]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-stone-600 uppercase">Protein (g)</label>
                    <input
                      type="number"
                      disabled={editUseGov}
                      value={editUseGov ? GOVERNMENT_RECOMMENDATIONS[editCountry]?.protein || 56 : editPro}
                      onChange={(e) => setEditPro(e.target.value)}
                      className="w-full px-3 py-2 bg-white disabled:bg-stone-100 border border-stone-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#D95338]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-stone-600 uppercase">Carbohydrates (g)</label>
                    <input
                      type="number"
                      disabled={editUseGov}
                      value={editUseGov ? GOVERNMENT_RECOMMENDATIONS[editCountry]?.carbs || 225 : editCarb}
                      onChange={(e) => setEditCarb(e.target.value)}
                      className="w-full px-3 py-2 bg-white disabled:bg-stone-100 border border-stone-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#D95338]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-stone-600 uppercase">Fat (g)</label>
                    <input
                      type="number"
                      disabled={editUseGov}
                      value={editUseGov ? GOVERNMENT_RECOMMENDATIONS[editCountry]?.fat || 65 : editFatVal}
                      onChange={(e) => setEditFatVal(e.target.value)}
                      className="w-full px-3 py-2 bg-white disabled:bg-stone-100 border border-stone-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#D95338]"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[9px] font-black text-stone-600 uppercase">Sodium Limit (mg)</label>
                    <input
                      type="number"
                      disabled={editUseGov}
                      value={editUseGov ? GOVERNMENT_RECOMMENDATIONS[editCountry]?.sodium || 2300 : editSod}
                      onChange={(e) => setEditSod(e.target.value)}
                      className="w-full px-3 py-2 bg-white disabled:bg-stone-100 border border-stone-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#D95338]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-300/70 flex justify-end gap-2">
              <button
                onClick={() => setShowGoalSettings(false)}
                className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-stone-200/60 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGoalSettings}
                disabled={updateGoalsMutation.isPending}
                className="px-5 py-2 bg-[#D95338] hover:bg-[#C24127] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {updateGoalsMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Apply Intake Goals</span>
              </button>
            </div>
          </div>
        )}

        {/* RESET LOGS DIALOG */}
        {showResetDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-[#FAF6EE] text-zinc-900 rounded-[28px] max-w-sm w-full p-6 shadow-2xl border border-[#FAF6EE]/90 animate-in zoom-in-95 duration-150 flex flex-col gap-4">
              <div className="flex items-center gap-3 text-[#D95338]">
                <Settings className="w-6 h-6" />
                <h3 className="text-lg font-black text-zinc-900">Reset Today's Logs?</h3>
              </div>
              <p className="text-xs font-semibold text-stone-600 leading-relaxed">
                Are you sure you want to clear your active food log list for today? This will clear all entries for this date and reset your total energy tracker back to 0%.
              </p>
              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowResetDialog(false)}
                  className="px-4 py-2 hover:bg-stone-200/70 text-stone-700 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => clearLogsMutation.mutate()}
                  disabled={clearLogsMutation.isPending}
                  className="px-5 py-2 bg-[#D95338] hover:bg-[#C24127] text-white rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {clearLogsMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Confirm"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DATE SELECTOR NAV & CURRENT TARGET OVERVIEW */}
        <div className="bg-[#FAF6EE] text-zinc-900 border border-[#FAF6EE]/80 rounded-2xl p-3.5 sm:p-4 shadow-xl backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Dynamic Date Swapping */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => changeDate(-1)}
                className="p-2 bg-stone-200/80 hover:bg-stone-300/80 text-zinc-800 rounded-xl transition-all border border-stone-300/60 shadow-xs cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-300/80 rounded-xl shadow-xs">
                <Calendar className="w-4 h-4 text-[#D95338]" />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900 min-w-[75px] text-center">
                  {formattedDateLabel}
                </span>
              </div>

              <button
                onClick={() => changeDate(1)}
                className="p-2 bg-stone-200/80 hover:bg-stone-300/80 text-zinc-800 rounded-xl transition-all border border-stone-300/60 shadow-xs cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Target Mode Info Badge */}
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none">{targets.flag}</span>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-stone-500">Baseline Target</div>
                  <div className="text-xs font-black text-zinc-900 leading-tight">
                    {targets.name}
                  </div>
                </div>
              </div>
              <button
                onClick={openGoalSettings}
                className="px-3.5 py-2 bg-[#D95338] hover:bg-[#C24127] text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer whitespace-nowrap"
                id="change-baseline-btn"
              >
                Change Target
              </button>
            </div>

          </div>
        </div>

        {/* NUTRITION METRICS & GOAL PROGRESS (SYMMETRICAL, MODERN LAYOUT) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          
          {/* CALORIES / ENERGY BALANCE CARD */}
          <div className="bg-[#FAF6EE] text-zinc-900 border border-[#FAF6EE]/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">Total Energy Intake</span>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg ${calorieInfo.badgeClass}`}>
                {calorieInfo.pct}% {calorieInfo.isExceeded ? "Exceeded" : "of Limit"}
              </span>
            </div>

            <div className="py-4 flex flex-col items-center text-center">
              <span className="text-4xl sm:text-5xl font-serif font-extrabold text-zinc-900 tracking-tight leading-none">
                {totals.calories}
              </span>
              <span className="text-[10px] font-black uppercase text-stone-500 tracking-widest mt-1">kcal consumed</span>
              
              {/* Progress Bar with smooth rounded corners and soft contrasting track line */}
              <div className="w-full bg-stone-200/90 border border-stone-300/40 h-3 rounded-full mt-4 overflow-hidden shadow-inner p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${calorieInfo.color}`}
                  style={{ width: `${Math.min(100, calorieInfo.pct)}%` }}
                />
              </div>

              <div className="w-full flex items-center justify-between text-xs font-bold text-stone-600 mt-2.5">
                <span>Health Canada Limit:</span>
                <span className="text-zinc-900 font-extrabold">{targets.calories} kcal</span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-stone-200/70 text-center">
              <span className={`text-[11px] font-bold ${calorieInfo.isExceeded ? "text-[#D95338]" : "text-[#6E8B6B]"}`}>
                {calorieInfo.isExceeded 
                  ? `⚠️ Energy limit exceeded by ${totals.calories - targets.calories} kcal` 
                  : `✓ Energy intake on track (${Math.max(0, targets.calories - totals.calories)} kcal remaining)`}
              </span>
            </div>
          </div>

          {/* NUTRIENTS BREAKDOWN (HEALTH CANADA BASELINE) */}
          <div className="bg-[#FAF6EE] text-zinc-900 border border-[#FAF6EE]/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">Health Canada Baseline (Daily DRI)</span>
              <span className="text-[9px] font-bold text-stone-500 bg-stone-200/60 px-2 py-0.5 rounded-md">
                Adult Reference
              </span>
            </div>

            <div className="space-y-3 my-auto">
              
              {/* Protein: 56g target */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-800 leading-tight">
                  <span className="flex items-center gap-1.5">🍗 Protein Target</span>
                  <div className="flex items-center gap-1.5">
                    <span>{totals.protein}g <span className="text-stone-400 font-normal">/ {targets.protein}g</span></span>
                    <span className={`text-[10px] font-black ${proteinInfo.textClass}`}>({proteinInfo.pct}%)</span>
                  </div>
                </div>
                <div className="w-full bg-stone-200/90 border border-stone-300/40 h-2.5 rounded-full overflow-hidden shadow-inner p-0.5">
                  <div 
                    className="bg-[#6E8B6B] h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(100, proteinInfo.pct)}%` }}
                  />
                </div>
              </div>

              {/* Carbs: 225g target */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-800 leading-tight">
                  <span className="flex items-center gap-1.5">🍞 Carbs Target</span>
                  <div className="flex items-center gap-1.5">
                    <span>{totals.carbs}g <span className="text-stone-400 font-normal">/ {targets.carbs}g</span></span>
                    <span className="text-[10px] font-black text-stone-600">({carbsInfo.pct}%)</span>
                  </div>
                </div>
                <div className="w-full bg-stone-200/90 border border-stone-300/40 h-2.5 rounded-full overflow-hidden shadow-inner p-0.5">
                  <div 
                    className="bg-[#D4A373] h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(100, carbsInfo.pct)}%` }}
                  />
                </div>
              </div>

              {/* Fat: 65g target */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-800 leading-tight">
                  <span className="flex items-center gap-1.5">🥑 Fat Target</span>
                  <div className="flex items-center gap-1.5">
                    <span>{totals.fat}g <span className="text-stone-400 font-normal">/ {targets.fat}g</span></span>
                    <span className="text-[10px] font-black text-stone-600">({fatInfo.pct}%)</span>
                  </div>
                </div>
                <div className="w-full bg-stone-200/90 border border-stone-300/40 h-2.5 rounded-full overflow-hidden shadow-inner p-0.5">
                  <div 
                    className="bg-[#8DA38A] h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(100, fatInfo.pct)}%` }}
                  />
                </div>
              </div>

              {/* Sodium: 2300mg limit */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-800 leading-tight">
                  <span className="flex items-center gap-1.5">🧂 Sodium Limit</span>
                  <div className="flex items-center gap-1.5">
                    <span className={totals.sodium > targets.sodium ? "text-[#D95338] font-black" : ""}>
                      {totals.sodium}mg <span className="text-stone-400 font-normal">/ {targets.sodium}mg</span>
                    </span>
                    <span className={`text-[10px] font-black ${sodiumInfo.isExceeded ? "text-[#D95338]" : "text-[#6E8B6B]"}`}>
                      ({sodiumInfo.pct}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-stone-200/90 border border-stone-300/40 h-2.5 rounded-full overflow-hidden shadow-inner p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      totals.sodium > targets.sodium ? "bg-[#D95338] animate-pulse" : "bg-[#6E8B6B]"
                    }`}
                    style={{ width: `${Math.min(100, sodiumInfo.pct)}%` }}
                  />
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ADD FOOD LOG ENGINE */}
        <div className="bg-[#FAF6EE] text-zinc-900 border border-[#FAF6EE]/80 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#D95338]" />
              <span>Log Consumed Intake</span>
            </h4>
            
            <div className="flex bg-stone-200/80 p-1 rounded-xl border border-stone-300/60">
              <button
                onClick={() => setActiveLogTab("recipe")}
                className={`px-3.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  activeLogTab === "recipe" 
                    ? "bg-[#FAF6EE] text-[#D95338] shadow-xs" 
                    : "text-stone-600 hover:text-zinc-900"
                }`}
              >
                Recipe List
              </button>
              <button
                onClick={() => setActiveLogTab("custom")}
                className={`px-3.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  activeLogTab === "custom" 
                    ? "bg-[#FAF6EE] text-[#D95338] shadow-xs" 
                    : "text-stone-600 hover:text-zinc-900"
                }`}
              >
                Custom Food
              </button>
            </div>
          </div>

          {activeLogTab === "recipe" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-600">Select Recipe</label>
                  <select
                    value={selectedRecipeId}
                    onChange={(e) => setSelectedRecipeId(e.target.value)}
                    className="w-full px-3 py-2 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-[#D95338] text-zinc-900 cursor-pointer shadow-xs"
                  >
                    <option value="">-- Choose from your recipe library --</option>
                    {recipes.map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {rec.title} {rec.nutrition ? `(${rec.nutrition.calories} kcal/serving)` : "(No nutrition facts)"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-600">Servings Consumed</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      value={recipeServings}
                      onChange={(e) => setRecipeServings(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-center text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#D95338] shadow-xs"
                    />
                    <button
                      disabled={!selectedRecipeId || createLogMutation.isPending || isEstimating !== null}
                      onClick={handleLogRecipe}
                      className="px-4 py-2 bg-[#D95338] hover:bg-[#C24127] disabled:bg-stone-300 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm"
                    >
                      {createLogMutation.isPending || isEstimating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Logging...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Log Food</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {selectedRecipe && !selectedRecipe.nutrition && (
                <div className="p-3 bg-amber-500/10 border border-dashed border-amber-400 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2 text-amber-900">
                    <Sparkles className="w-4 h-4 shrink-0 text-[#D95338] animate-pulse" />
                    <p className="text-[11px] text-stone-700 font-semibold leading-tight">
                      No nutrition profile yet. Gemini AI will estimate macros upon logging.
                    </p>
                  </div>
                  <button
                    disabled={isEstimating !== null}
                    onClick={() => handleEstimateRecipeNutrition(selectedRecipe.id)}
                    className="px-3 py-1.5 bg-[#D95338] hover:bg-[#C24127] disabled:bg-stone-300 text-white rounded-lg text-[9.5px] font-black uppercase tracking-widest transition-all select-none flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
                  >
                    {isEstimating ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Estimating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span>Estimate now</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-600">Food Item Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Greek Yogurt, Protein Shake"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#D95338] shadow-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-600">Calories (kcal)</label>
                  <input
                    type="number"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#D95338] shadow-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-600">Servings</label>
                  <input
                    type="number"
                    step="0.5"
                    value={customServings}
                    onChange={(e) => setCustomServings(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#D95338] shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-600">Protein (g)</label>
                  <input
                    type="number"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#D95338] shadow-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-600">Carbs (g)</label>
                  <input
                    type="number"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#D95338] shadow-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-600">Fat (g)</label>
                  <input
                    type="number"
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#D95338] shadow-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-600">Sodium (mg)</label>
                  <input
                    type="number"
                    value={customSodium}
                    onChange={(e) => setCustomSodium(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#D95338] shadow-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  disabled={!customName.trim() || createLogMutation.isPending}
                  onClick={handleLogCustom}
                  className="px-5 py-2 bg-[#D95338] hover:bg-[#C24127] disabled:bg-stone-300 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all select-none cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Log Custom Item</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* LOGGED INTAKE ITEMS LIST */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-white/15 pb-2">
            <Calendar className="w-4 h-4 text-[#D95338]" />
            <span>Food diary logs for {formattedDateLabel}</span>
          </h4>

          {isLoadingLogs ? (
            <div className="py-6 text-center text-xs text-white/80 font-bold flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#D95338]" />
              <span>Syncing food diary...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-[#FAF6EE] rounded-2xl border border-[#FAF6EE]/90 p-6 text-center max-w-md mx-auto space-y-2 shadow-xl">
              <span className="text-3xl block">🥪</span>
              <div>
                <h5 className="text-xs font-black uppercase tracking-wider text-zinc-900">Food diary is empty</h5>
                <p className="text-[11px] text-stone-600 font-medium leading-normal max-w-xs mx-auto mt-1">
                  No recipes or custom foods logged for this date yet. Use the selector above to record what you ate.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {logs.map((log) => {
                const totalCals = Math.round((log.calories || 0) * (log.servings || 1));
                return (
                  <div
                    key={log.id}
                    className="bg-[#FAF6EE] text-zinc-900 border border-[#FAF6EE]/90 rounded-2xl p-4 hover:shadow-xl transition-all flex items-center justify-between gap-3 text-left shadow-lg"
                  >
                    <div>
                      <h5 className="text-sm font-extrabold text-zinc-900">{log.name}</h5>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-black uppercase text-stone-500 tracking-wider mt-1">
                        <span>Servings: {log.servings}x</span>
                        <span className="text-[#D95338] font-bold">Cal: {log.calories} kcal</span>
                        <span>P: {log.protein}g</span>
                        <span>C: {log.carbs}g</span>
                        <span>F: {log.fat}g</span>
                        <span>Na: {log.sodium}mg</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-zinc-900 bg-white px-3 py-1.5 rounded-xl border border-stone-200/80 shadow-xs whitespace-nowrap">
                        {totalCals} kcal
                      </span>
                      <button
                        onClick={() => deleteLogMutation.mutate(log.id)}
                        disabled={deleteLogMutation.isPending}
                        className="p-2 hover:bg-stone-200/80 rounded-xl text-stone-400 hover:text-[#D95338] transition-colors cursor-pointer"
                        title="Remove entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

    </div>
  );
}
