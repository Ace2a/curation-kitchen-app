/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Search, Coffee, Utensils, ChefHat, Cookie, Cake, Sparkles, BookOpen, AlertCircle, Home, FolderOpen, Lock, Crown
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Recipe, Collection } from "../../types";
import { recipeClient } from "../../api/recipeClient";
import RecipeCard from "./RecipeCard";
import { Button } from "../ui/button";
import { KitchenLogo } from "../ui/KitchenLogo";

interface CategoryFilterModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  collections?: Collection[];
  onEditRecipe?: (recipe: Recipe) => void;
  isPage?: boolean;
  initialCategory?: string;
}

const CATEGORIES = [
  { 
    name: "Breakfast", 
    icon: Coffee, 
    color: "bg-amber-50/75 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/40", 
    activeOutline: "border-amber-500 ring-2 ring-amber-500/20 dark:ring-amber-500/10 font-black" 
  },
  { 
    name: "Lunch", 
    icon: Utensils, 
    color: "bg-emerald-50/75 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/40", 
    activeOutline: "border-emerald-500 ring-2 ring-emerald-500/20 dark:ring-emerald-500/10 font-black" 
  },
  { 
    name: "Dinner", 
    icon: ChefHat, 
    color: "bg-rose-50/75 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-900/40", 
    activeOutline: "border-rose-500 ring-2 ring-rose-500/20 dark:ring-rose-500/10 font-black" 
  },
  { 
    name: "Snacks", 
    icon: Cookie, 
    color: "bg-orange-50/75 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300 border-orange-200/60 dark:border-orange-900/40", 
    activeOutline: "border-orange-500 ring-2 ring-orange-500/20 dark:ring-orange-500/10 font-black" 
  },
  { 
    name: "Dessert", 
    icon: Cake, 
    color: "bg-pink-50/75 dark:bg-pink-950/20 text-pink-700 dark:text-pink-300 border-pink-200/60 dark:border-pink-900/40", 
    activeOutline: "border-pink-500 ring-2 ring-pink-500/20 dark:ring-pink-500/10 font-black" 
  }
];

export function CategoryFilterModal({ isOpen = true, onClose, collections = [], onEditRecipe = () => {}, isPage = false, initialCategory }: CategoryFilterModalProps) {
  const [searchParams] = useSearchParams();
  const queryCat = searchParams.get("category") || searchParams.get("cat") || initialCategory;
  
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (queryCat) {
      const match = CATEGORIES.find(c => c.name.toLowerCase() === queryCat.toLowerCase());
      if (match) return match.name;
    }
    return "Breakfast";
  });
  const [textQuery, setTextQuery] = useState("");
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem("kitchen_is_premium") === "true";
  });

  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: () => recipeClient.recipes.list("-created_date"),
    enabled: isOpen || isPage
  });

  const getCategoryForRecipe = (recipe: Recipe): string => {
    const heading = (recipe.meal_heading || "").toLowerCase().trim();
    if (heading.includes("breakfast")) return "Breakfast";
    if (heading.includes("lunch")) return "Lunch";
    if (heading.includes("dinner")) return "Dinner";
    if (heading.includes("snack")) return "Snacks";
    if (heading.includes("dessert") || heading.includes("sweet")) return "Dessert";
    return "Other";
  };

  // Group recipes by category
  const categorizedRecipes = recipes.reduce((acc, recipe) => {
    const cat = getCategoryForRecipe(recipe);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(recipe);
    return acc;
  }, {} as Record<string, Recipe[]>);

  // Filter recipes inside active category by text query
  const activeCategoryRecipes = categorizedRecipes[selectedCategory] || [];
  const filteredRecipes = activeCategoryRecipes.filter(recipe => {
    if (!textQuery.trim()) return true;
    const q = textQuery.toLowerCase();
    const titleMatch = recipe.title?.toLowerCase().includes(q);
    const descMatch = recipe.description?.toLowerCase().includes(q);
    const tagsMatch = recipe.tags?.some(t => t.toLowerCase().includes(q));
    return titleMatch || descMatch || tagsMatch;
  });

  // Calculate total combined recipes in all 5 categories
  const totalCombinedCount = ["Breakfast", "Lunch", "Dinner", "Snacks", "Dessert"].reduce((sum, cat) => {
    return sum + (categorizedRecipes[cat] || []).length;
  }, 0);

  const handleUpgrade = () => {
    localStorage.setItem("kitchen_is_premium", "true");
    setIsPremium(true);
  };

  const handleDowngrade = () => {
    localStorage.setItem("kitchen_is_premium", "false");
    setIsPremium(false);
  };

  if (!isOpen && !isPage) return null;

  // Premium lock overlay content if count exceeds 15 and user is not premium
  const isGated = !isPremium && totalCombinedCount >= 15;

  const renderContent = () => (
    <div className="flex flex-col space-y-6 w-full max-w-xl mx-auto px-4 py-6" id="category-mobile-container">
      {/* 1. TOP LOGICAL SEARCH CONTAINER */}
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-wider" id="mobile-category-title">
              Recipe Category Organizer
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Browse and navigate your saved culinary creations by meal type.
            </p>
          </div>

          {/* Interactive Premium State Toggle */}
          <button
            onClick={() => {
              if (isPremium) handleDowngrade();
              else handleUpgrade();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider transition-all duration-300 border cursor-pointer select-none ${
              isPremium 
                ? "bg-amber-500/10 text-amber-600 border-amber-500/20" 
                : "bg-zinc-150 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
            }`}
          >
            <Crown className={`w-3 h-3 ${isPremium ? "fill-amber-500 stroke-amber-600" : ""}`} />
            <span>{isPremium ? "PREMIUM" : "FREE TIER"}</span>
          </button>
        </div>

        {/* Full-width Material 3 SearchBar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder={`Search recipes in ${selectedCategory.toLowerCase()}...`}
            value={textQuery}
            onChange={(e) => setTextQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 text-sm bg-zinc-100/70 dark:bg-zinc-850/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium text-zinc-800 dark:text-zinc-100 placeholder-zinc-400"
          />
          {textQuery && (
            <button 
              onClick={() => setTextQuery("")}
              className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. DYNAMIC 2-COLUMN FEATURE GRID */}
      <div className="space-y-2">
        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1">
          Select Folder
        </span>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat, idx) => {
            const count = (categorizedRecipes[cat.name] || []).length;
            const isActive = selectedCategory === cat.name;
            const Icon = cat.icon;
            
            // Layout 5th item (Dessert) centered or col-span-2 for modern balance
            const gridClass = idx === 4 ? "col-span-2" : "";

            return (
              <button
                key={cat.name}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setTextQuery("");
                }}
                className={`flex items-center justify-between px-4 py-4.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${gridClass} ${
                  isActive 
                    ? `${cat.color} ${cat.activeOutline} scale-[1.01]` 
                    : `${cat.color} border-zinc-150 dark:border-zinc-800 hover:bg-zinc-100/40 dark:hover:bg-zinc-850/40`
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-white dark:bg-zinc-900 shadow-xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wide">{cat.name}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <hr className="border-zinc-200 dark:border-zinc-800" />

      {/* 3. CONTEXTUAL FOLDER CONTENT AREA */}
      <div className="space-y-4 flex-grow">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {selectedCategory} Folder • {filteredRecipes.length} Item{filteredRecipes.length !== 1 ? "s" : ""}
          </h3>
        </div>

        {isGated ? (
          /* 4. MONETIZATION PROTECTION GATE */
          <div className="relative rounded-2xl border-2 border-dashed border-red-500/30 bg-zinc-100/30 dark:bg-zinc-900/30 p-8 text-center space-y-4 overflow-hidden shadow-xs">
            <div className="absolute inset-0 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md z-10" />
            
            <div className="relative z-20 space-y-4 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                  Premium Category Gate
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  You have stored {totalCombinedCount} recipes. The free tier is limited to 15 recipes across categories. Upgrade now to unlock unlimited folders!
                </p>
              </div>
              <Button 
                onClick={handleUpgrade} 
                className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-bold uppercase tracking-wider text-[11px] px-6 py-2.5 rounded-xl shadow-md cursor-pointer"
              >
                Upgrade to Premium
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="w-6 h-6 rounded-full border-3 border-zinc-200 border-t-red-600 animate-spin" />
            <p className="text-[10px] font-bold text-zinc-500">Loading meals...</p>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center flex flex-col items-center justify-center space-y-3" id="categories-empty-card">
            <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-850 flex items-center justify-center text-zinc-400">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                No recipes saved in this category yet.
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                Browse the web to add one!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-12">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                collections={collections}
                onEdit={(r) => {
                  if (onClose) onClose();
                  onEditRecipe(r);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (isPage) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col" id="categories-page-container">
        {/* Top Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
          <div className="max-w-5xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
            {/* Left: Home Button */}
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 cursor-pointer">
                <Home className="w-3.5 h-3.5 text-zinc-500" />
                <span>Home</span>
              </Button>
            </Link>

            {/* Center: Title */}
            <h1 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider">
              Category Organizer
            </h1>

            {/* Right: Logo */}
            <Link to="/" className="flex items-center group" title="Back to Home">
              <div className="relative">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 via-orange-500 to-amber-500 shadow-md ring-2 ring-red-100 dark:ring-red-950/40 overflow-hidden transform group-hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0.5 rounded-full border border-dashed border-white/35" />
                  <KitchenLogo className="w-5 h-5 text-white z-30" plateColor="white" letterColor="white" />
                </div>
                <div className="absolute -top-1 -right-1 z-40 pointer-events-none flex items-center justify-center">
                  <div className="absolute w-3 h-3 bg-yellow-300 rounded-full blur-[1.5px] opacity-85 animate-ping" />
                  <Sparkles className="relative w-3.5 h-3.5 text-yellow-300 fill-yellow-200 drop-shadow-[0_0_6px_rgba(253,224,71,1)] animate-pulse" />
                </div>
              </div>
            </Link>
          </div>
        </header>

        <div className="max-w-xl w-full mx-auto flex-grow flex flex-col py-6">
          <div className="relative w-full rounded-3xl bg-white dark:bg-zinc-900 shadow-md border border-zinc-150 dark:border-zinc-800 flex flex-col flex-grow min-h-[75vh]" id="categories-page-content">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/75 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-50 w-full max-w-xl h-[85vh] bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-150 dark:border-zinc-800 overflow-y-auto flex flex-col"
          >
            {/* Header close button */}
            <div className="absolute right-4 top-4 z-55">
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl h-9 w-9 hover:bg-zinc-200/50 dark:hover:bg-zinc-800">
                  <X className="w-5 h-5 text-zinc-500" />
                </Button>
              )}
            </div>

            {renderContent()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
