/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { recipeClient } from "../../api/recipeClient";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, Search, X, Sparkles, Heart, Folder, Home
} from "lucide-react";
import { motion } from "motion/react";
import RecipeCard from "./RecipeCard";
import { Recipe } from "../../types";
import { Button } from "../ui/button";
import { KitchenLogo } from "../ui/KitchenLogo";

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [textSearch, setTextSearch] = useState("");

  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => recipeClient.collections.list("-created_date"),
  });

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => recipeClient.recipes.list("-created_date"),
  });

  const favoriteRecipes = recipes.filter((r) => r.is_favorite);

  const getFilteredFavorites = () => {
    let list = favoriteRecipes;

    if (textSearch.trim()) {
      const q = textSearch.toLowerCase();
      list = list.filter((recipe) => {
        const titleMatch = recipe.title?.toLowerCase().includes(q);
        const descMatch = recipe.description?.toLowerCase().includes(q);
        const tagsMatch = recipe.tags?.some((t) => t.toLowerCase().includes(q));
        return titleMatch || descMatch || tagsMatch;
      });
    }

    return list;
  };

  const filteredRecipes = getFilteredFavorites();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
      <div>
        {/* Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            {/* Left: Home Button */}
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 cursor-pointer">
                <Home className="w-3.5 h-3.5 text-zinc-500" />
                <span>Home</span>
              </Button>
            </Link>

            {/* Center: Title */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                <Heart className="w-3 h-3 text-red-600 fill-red-500 animate-pulse" />
              </div>
              <h1 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                Bookmarked Favorites
              </h1>
            </div>

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

        {/* Search Bar / Filters */}
        <div className="bg-white border-b border-zinc-200/60 dark:bg-zinc-900 dark:border-zinc-800/80 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search your favorites..."
                value={textSearch}
                onChange={(e) => setTextSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2 text-xs bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-850 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:border-red-500 font-semibold text-zinc-800 dark:text-zinc-200"
              />
              {textSearch && (
                <button 
                  onClick={() => setTextSearch("")}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
              {filteredRecipes.length} Saved {filteredRecipes.length === 1 ? "recipe" : "recipes"}
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : favoriteRecipes.length === 0 ? (
            /* Elegant empty state */
            <div className="max-w-lg mx-auto bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-zinc-150 dark:border-zinc-800 p-10 text-center space-y-4 shadow-lg">
              <div className="w-14 h-14 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center mx-auto text-red-500">
                <Heart className="w-7 h-7 text-red-500 fill-red-400 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black uppercase tracking-wider text-red-600">No bookmarked favorites yet</h3>
                <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Easily save and bookmark your go-to kitchen masterpieces for instant access. 
                  Just click on any recipe to view its details, and tap the <strong className="text-red-500">"Favorite" heart button</strong> in the header bar!
                </p>
              </div>
              <div className="pt-2">
                <button 
                  onClick={() => navigate("/")}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95"
                >
                  Explore Recipes
                </button>
              </div>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="max-w-md mx-auto text-center py-16 space-y-2">
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                No favorites match your search.
              </p>
              <button 
                onClick={() => setTextSearch("")}
                className="text-xs text-red-500 font-bold hover:underline"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            /* Recipes Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  collections={collections}
                  onEdit={(r) => navigate("/recipes/edit/" + r.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

    </div>
  );
}
