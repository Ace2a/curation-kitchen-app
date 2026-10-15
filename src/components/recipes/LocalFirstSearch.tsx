/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, Tag, SlidersHorizontal, HelpCircle, Check, X, 
  Sparkles, Database, Wifi, Zap, FileText, ChevronDown, ChevronUp, RefreshCw, Loader2, Plus, Globe
} from "lucide-react";
import { Recipe, Collection } from "../../types";
import { LocalSearchIndex } from "../../lib/searchIndex";
import RecipeCard from "./RecipeCard";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { recipeClient } from "../../api/recipeClient";

interface LocalFirstSearchProps {
  recipes: Recipe[];
  collections: Collection[];
  onEditRecipe: (recipe: Recipe) => void;
  isOffline: boolean;
}

type SearchTab = "local" | "ai";

export default function LocalFirstSearch({ 
  recipes, 
  collections, 
  onEditRecipe, 
  isOffline 
}: LocalFirstSearchProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Tab controller
  const [activeTab, setActiveTab] = useState<SearchTab>("local");

  // Local Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTips, setShowTips] = useState(false);

  // AI Search state
  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const [importSuccessUrl, setImportSuccessUrl] = useState<string | null>(null);
  const [importError, setImportError] = useState("");

  // Initialize and memoize our custom inverted full-text search index
  const searchIndex = useMemo(() => {
    return new LocalSearchIndex(recipes);
  }, [recipes]);

  // Query search results instantly via local-first search engine
  const searchResults = useMemo(() => {
    return searchIndex.search(searchQuery, selectedTags);
  }, [searchIndex, searchQuery, selectedTags]);

  // Extract all unique tags present across all recipes
  const allUniqueTags = useMemo(() => {
    return searchIndex.getAllUniqueTags();
  }, [searchIndex]);

  // Calculate quick stats for indexing demonstration
  const stats = useMemo(() => {
    const totalIngredients = new Set<string>();
    recipes.forEach(r => {
      (r.ingredients || []).forEach(ing => {
        // clean ingredient name lightly for unique count
        const ingName = typeof ing === "string" ? ing : ing.name || ing.raw || "";
        const clean = ingName.replace(/^\d+\s*(cup|cups|tbsp|tsp|g|oz|ml|pound|pounds|piece|pieces)?\s+/gi, "").toLowerCase().trim();
        if (clean) totalIngredients.add(clean);
      });
    });

    return {
      recipeCount: recipes.length,
      tagCount: allUniqueTags.length,
      ingredientCount: totalIngredients.size
    };
  }, [recipes, allUniqueTags]);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
  };

  // AI search logic
  const handleAiSearch = async () => {
    if (!aiQuery.trim() || isOffline) return;
    setIsSearching(true);
    setSearchError("");
    setAiResults([]);
    setImportSuccessUrl(null);
    setImportError("");
    
    try {
      const response = await fetch("/api/gemini/search-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery.trim() })
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAiResults(data);
    } catch (err: any) {
      console.error("AI Search error:", err);
      setSearchError(err.message || "Failed to retrieve AI search results. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Quick search suggestions
  const SAMPLE_LOCAL_SEARCHES = ["Dinner", "Breakfast", "Desserts", "Chicken", "Pasta", "Quick"];
  const SAMPLE_AI_SEARCHES = ["Authentic Pad Thai", "Creamy Mushroom Risotto", "Shakshuka with Feta", "Healthy Salmon Bowl"];

  // Import and auto-save logic
  const handleImportAndSave = async (url: string, suggestedHeading?: string) => {
    setImportingUrl(url);
    setImportError("");
    setImportSuccessUrl(null);
    
    try {
      const response = await fetch("/api/gemini/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: url })
      });
      
      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }
      
      const parsed = await response.json();
      
      const rawIngredients = parsed.ingredients || parsed.formatted_ingredients || [];
      const formattedIngredients = rawIngredients.map((ing: any) => {
        if (typeof ing === "object" && ing !== null) {
          const qty = ing.quantity !== undefined ? ing.quantity : (ing.amount !== undefined ? ing.amount : "");
          const unit = ing.unit || "";
          const name = ing.name || "";
          const mods = Array.isArray(ing.modifiers) ? ing.modifiers.join(", ") : (ing.modifier || "");
          return `${qty} ${unit} ${name}${mods ? ` (${mods})` : ""}`.replace(/\s+/g, " ").trim();
        }
        return String(ing);
      });

      // Save directly into user's database
      await recipeClient.recipes.create({
        title: parsed.title || parsed.recipe_name || "Imported Recipe",
        description: parsed.description || "Imported via Global AI Search.",
        prep_time: parsed.prep_time || "15 mins",
        cook_time: parsed.cook_time || "30 mins",
        servings: parsed.servings || 4,
        image_url: parsed.image_url || undefined,
        collection_id: undefined,
        meal_heading: (parsed.meal_heading || suggestedHeading || "dinner").toLowerCase(),
        ingredients: formattedIngredients,
        instructions: parsed.instructions || parsed.steps || [],
        tags: parsed.tags || ["Imported"],
      });
      
      // Invalidate queries to reload live lists
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      
      setImportSuccessUrl(url);
    } catch (err: any) {
      console.error("Import error:", err);
      setImportError(err.message || "Failed to parse and save this recipe. Try another webpage link.");
    } finally {
      setImportingUrl(null);
    }
  };

  const switchToAiSearchWithQuery = (query: string) => {
    setAiQuery(query);
    setActiveTab("ai");
    setTimeout(() => {
      if (!isOffline && query.trim()) {
        handleAiSearch();
      }
    }, 150);
  };

  return (
    <div className="w-full max-w-4xl px-4 mt-2 space-y-6">
      
      {/* Tab Selector */}
      <div className="flex bg-zinc-200/50 dark:bg-zinc-850/50 p-1.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 max-w-lg mx-auto">
        <button
          onClick={() => setActiveTab("local")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer select-none ${
            activeTab === "local"
              ? "bg-white dark:bg-zinc-900 text-red-600 shadow-sm border border-zinc-200/40 dark:border-zinc-850"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
          id="local-tab-btn"
        >
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-4" />
            <span>Search Saved Collection</span>
          </div>
          <span className="text-[9px] font-normal text-zinc-400 capitalize tracking-normal">In-memory offline index</span>
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer select-none ${
            activeTab === "ai"
              ? "bg-white dark:bg-zinc-900 text-red-600 shadow-sm border border-zinc-200/40 dark:border-zinc-850"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
          id="ai-tab-btn"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Global AI Search</span>
          </div>
          <span className="text-[9px] font-normal text-zinc-400 capitalize tracking-normal">Search web with Gemini</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "local" ? (
          <motion.div
            key="local-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="space-y-6"
          >
            {/* Search Header Console */}
            <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-lg space-y-4">
              
              {/* Title row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-red-50 dark:bg-red-950/40 rounded-lg text-red-600">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <span>Local-First Search Index</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-black tracking-normal uppercase bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 rounded">
                        <Zap className="w-2.5 h-2.5 animate-pulse" /> Offline Active
                      </span>
                    </h3>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                      Instant full-text query engine running locally in your browser's RAM memory cache.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowTips(!showTips)}
                  className="text-[10px] text-zinc-500 hover:text-red-600 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer select-none transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Search Tips</span>
                  {showTips ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Dynamic Index Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-50 dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block">Recipes Indexed</span>
                  <span className="text-sm font-black text-zinc-800 dark:text-zinc-100 mt-0.5 block">{stats.recipeCount}</span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block">Dietary Tags</span>
                  <span className="text-sm font-black text-zinc-800 dark:text-zinc-100 mt-0.5 block">{stats.tagCount}</span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block">Unique Ingredients</span>
                  <span className="text-sm font-black text-zinc-800 dark:text-zinc-100 mt-0.5 block">{stats.ingredientCount}</span>
                </div>
              </div>

              {/* Search Tips Drawer */}
              <AnimatePresence>
                {showTips && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-zinc-50 dark:bg-zinc-850 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-2 font-medium">
                      <span className="font-black text-red-600 uppercase tracking-wider block text-[10px]">💡 How Local Search Indexing Works:</span>
                      <p>
                        1. <strong>Weighted Ranking:</strong> Your queries are scored dynamically. Titles carry the highest priority (8x), followed by Dietary Tags (5x), Ingredients (4x), and Descriptions (1.5x).
                      </p>
                      <p>
                        2. <strong>Prefix Autocomplete:</strong> Partial words like <code>"ban"</code> or <code>"glut"</code> instantly index matching full terms such as <code>"banana"</code> or <code>"gluten-free"</code>.
                      </p>
                      <p>
                        3. <strong>Stopword Filtering:</strong> Noise words (e.g. <code>"with"</code>, <code>"and"</code>, <code>"the"</code>) are automatically filtered out to ensure accurate matching.
                      </p>
                      <p>
                        4. <strong>100% Offline-Friendly:</strong> Zero network payloads are sent. Index updates happen inside the browser immediately when recipes are added or synced.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search input field */}
              <div className="space-y-2">
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-zinc-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search recipes by title, ingredient (e.g., chocolate, bananas), tags, or meal headings..."
                    className="w-full pl-10 pr-10 py-3 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-hidden ring-1 ring-zinc-200 focus:ring-2 focus:ring-red-500 dark:ring-zinc-800 dark:focus:ring-red-600 rounded-xl text-xs font-semibold tracking-wide text-zinc-800 dark:text-zinc-100 transition-all placeholder-zinc-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Quick Search Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mr-1">Quick Suggestions:</span>
                  {SAMPLE_LOCAL_SEARCHES.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setSearchQuery(chip)}
                      className="px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold transition-all cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Tag Filter Pills */}
              {allUniqueTags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Filter by Dietary/Custom Tags</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {allUniqueTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer select-none flex items-center gap-1 ${
                            isSelected
                              ? "bg-red-600 border-red-600 text-white shadow-xs"
                              : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200/60 text-zinc-700 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:border-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Clear query & filters link */}
              {(searchQuery || selectedTags.length > 0) && (
                <div className="flex items-center justify-between text-[10px] font-bold pt-1">
                  <span className="text-zinc-400 uppercase tracking-wider">
                    Filtered matches: <strong className="text-zinc-800 dark:text-zinc-200">{searchResults.length}</strong> of {recipes.length}
                  </span>
                  <button
                    onClick={handleClearFilters}
                    className="text-red-600 hover:text-red-700 uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}

            </div>

            {/* SEARCH RESULTS LIST/GRID */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800 pb-2">
                <h4 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>
                    {searchQuery || selectedTags.length > 0 
                      ? `Filtered Index Matches (${searchResults.length})` 
                      : `Your Entire Recipe Library (${recipes.length})`}
                  </span>
                </h4>
                <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase">
                  In-Memory Search
                </span>
              </div>

              {searchResults.length === 0 ? (
                <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-zinc-150 dark:border-zinc-800 p-8 text-center space-y-4 shadow-md max-w-lg mx-auto">
                  <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">No matching recipes in saved collection</h5>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-normal font-medium">
                      We couldn't find any saved recipes matching <code>"{searchQuery}"</code>.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <button
                      onClick={handleClearFilters}
                      className="w-full sm:w-auto px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Clear Filters &amp; View All
                    </button>

                    {searchQuery && !isOffline && (
                      <button
                        onClick={() => switchToAiSearchWithQuery(searchQuery)}
                        className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Search Web for "{searchQuery}"</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                  {searchResults.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      collections={collections}
                      onEdit={onEditRecipe}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="ai-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="space-y-6"
          >
            {/* AI Search Console */}
            <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-lg space-y-4">
              
              {/* Title row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <span>Global AI Search Engine</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-black tracking-normal uppercase bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded">
                        Gemini AI Active
                      </span>
                    </h3>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                      Queries real-time Google search grounding and parses structured culinary data instantly.
                    </p>
                  </div>
                </div>
              </div>

              {isOffline ? (
                <div className="p-5 bg-amber-50/70 dark:bg-amber-950/20 border border-dashed border-amber-300 dark:border-amber-900 rounded-2xl flex flex-col items-center text-center space-y-2">
                  <Wifi className="w-8 h-8 text-amber-500 animate-bounce" />
                  <h5 className="text-xs font-black uppercase text-amber-800 dark:text-amber-400">Offline Restriction</h5>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500 max-w-sm font-medium leading-relaxed">
                    Global AI Search requires an active network connection to query external culinary resources. Please use the **Local Index** tab to search offline.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2.5">
                    <div className="relative flex-1 flex items-center">
                      <div className="absolute left-3.5 text-amber-500">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                      </div>
                      <input
                        type="text"
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        placeholder="e.g. Grandma's Shakshuka, Authentic Pad Thai, Matcha Crepe Cake..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAiSearch();
                          }
                        }}
                        className="w-full pl-10 pr-10 py-3 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-hidden ring-1 ring-zinc-200 focus:ring-2 focus:ring-amber-500 dark:ring-zinc-800 dark:focus:ring-amber-600 rounded-xl text-xs font-semibold tracking-wide text-zinc-800 dark:text-zinc-100 transition-all placeholder-zinc-400"
                      />
                      {aiQuery && (
                        <button
                          onClick={() => setAiQuery("")}
                          className="absolute right-3.5 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handleAiSearch}
                      disabled={isSearching || !aiQuery.trim()}
                      className="px-5 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer select-none transition-all"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>AI Search</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sample AI Search Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600/80 dark:text-amber-400 mr-1 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Try Searching:
                    </span>
                    {SAMPLE_AI_SEARCHES.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => {
                          setAiQuery(chip);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-[10px] font-semibold transition-all cursor-pointer border border-amber-200/50 dark:border-amber-900/40"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {searchError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-[10px] font-bold text-red-600 uppercase tracking-wide">
                      ⚠️ {searchError}
                    </div>
                  )}

                  {importError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-[10px] font-bold text-red-600 uppercase tracking-wide">
                      ⚠️ {importError}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* AI Search Results */}
            {!isOffline && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800 pb-2">
                  <h4 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {aiResults.length > 0 
                        ? `AI Grounded Web Matches (${aiResults.length})` 
                        : "Discover New Culinary Specialties"}
                    </span>
                  </h4>
                  <span className="text-[9px] font-mono font-bold text-amber-500 uppercase flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Grounded Search
                  </span>
                </div>

                {isSearching ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="relative inline-flex items-center justify-center">
                      <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-amber-500"></div>
                      <span className="absolute text-xl">🍲</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Querying Global Culinary Index...</p>
                      <p className="text-[10px] text-zinc-400 max-w-sm mx-auto leading-normal font-medium">
                        Using real-time web-search grounding to discover authentic, highly-rated recipes from global food blogs, specialty kitchens, and cultural collections.
                      </p>
                    </div>
                  </div>
                ) : aiResults.length === 0 ? (
                  <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-zinc-150 dark:border-zinc-800 p-12 text-center space-y-4 shadow-md max-w-lg mx-auto">
                    <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 rounded-full flex items-center justify-center mx-auto text-amber-500">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Search the Globe</h5>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-normal font-medium">
                        Type any recipe idea above, and we will crawl culinary networks to extract clean structured ingredients and steps you can import with a single click.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {aiResults.map((res: any, idx: number) => {
                      const isImporting = importingUrl === res.url;
                      const isSuccess = importSuccessUrl === res.url;
                      
                      const headingEmoji: Record<string, string> = {
                        breakfast: "🍳 Breakfast",
                        lunch: "🥗 Lunch",
                        dinner: "🍲 Dinner",
                        snacks: "🍪 Snacks",
                        desserts: "🍰 Desserts",
                        etc: "🥐 Others"
                      };
                      const headingVal = (res.meal_heading || "dinner").toLowerCase();
                      const headingLabel = headingEmoji[headingVal] || "🍲 Dinner";

                      return (
                        <div 
                          key={idx} 
                          className="bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between gap-4 text-left"
                        >
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/50 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                {res.source || "Web"}
                              </span>
                              <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200/50 dark:border-purple-900/50 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                {headingLabel}
                              </span>
                            </div>
                            <h4 className="font-black text-xs text-zinc-900 dark:text-white leading-tight">
                              {res.title}
                            </h4>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed font-semibold">
                              {res.description}
                            </p>
                            <div className="flex gap-4 text-[9px] text-zinc-400 uppercase font-black tracking-widest pt-1">
                              {res.prepTime && <span>Prep: {res.prepTime}</span>}
                              {res.cookTime && <span>Cook: {res.cookTime}</span>}
                            </div>
                          </div>
                          
                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
                            <a 
                              href={res.url} 
                              target="_blank" 
                              rel="referrer referrerPolicy"
                              className="text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-amber-500 transition-colors"
                            >
                              Visit Original
                            </a>

                            <button
                              disabled={isImporting || isSuccess}
                              onClick={() => handleImportAndSave(res.url, res.meal_heading)}
                              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                                isSuccess 
                                  ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border border-green-300 dark:border-green-900"
                                  : isImporting
                                    ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 cursor-not-allowed"
                                    : "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                              }`}
                            >
                              {isSuccess ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Imported & Saved</span>
                                </>
                              ) : isImporting ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Parsing & Saving...</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Import to Collection</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

