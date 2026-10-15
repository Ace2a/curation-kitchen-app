/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Recipe, Collection } from "../../types";
import { Clock, Users, Pencil, Utensils, Tag, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeClient } from "../../api/recipeClient";

interface RecipeCardProps {
  key?: string | number;
  recipe: Recipe;
  collections?: Collection[];
  onEdit: (recipe: Recipe) => void;
}

export default function RecipeCard({ recipe, collections = [], onEdit }: RecipeCardProps) {
  const queryClient = useQueryClient();

  // Find the collection name if this recipe belongs to one (cross-checking collection_id and recipe_ids)
  const collection = collections.find(
    (col) => col.id === recipe.collection_id || col.recipe_ids?.includes(recipe.id)
  );

  const categoryLabel = 
    collection?.name || 
    (recipe.meal_heading && recipe.meal_heading !== "etc" 
      ? recipe.meal_heading.charAt(0).toUpperCase() + recipe.meal_heading.slice(1) 
      : "Collection");

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      const nextFav = !recipe.is_favorite;
      return recipeClient.recipes.update(recipe.id, { is_favorite: nextFav });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  // Normalize prep & cook times for compact display
  const totalTime = (() => {
    const prep = recipe.prep_time || "";
    const cook = recipe.cook_time || "";
    if (!prep && !cook) return "Quick";
    if (prep && cook) return `${prep} prep • ${cook} cook`;
    return prep || cook;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.15 } }}
      className="group bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden relative"
      id={`recipe-card-${recipe.id}`}
    >
      {/* Recipe Thumbnail Image or Placeholder */}
      <Link to={`/recipes/${recipe.id}`} className="block relative aspect-video overflow-hidden bg-zinc-100 dark:bg-zinc-850 border-b border-zinc-100 dark:border-zinc-800">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-red-50 dark:from-zinc-900 dark:to-zinc-850 p-4">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 mb-2">
              <Utensils className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-red-500/80 uppercase tracking-widest font-sans">
              {recipe.meal_heading || "Recipe"}
            </span>
          </div>
        )}

        {/* Collection Badge over Image */}
        {collection && (
          <div className="absolute top-3 left-3 z-10">
            <span
              className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white shadow-xs"
              style={{ backgroundColor: collection.color || "#dc2626" }}
            >
              {collection.name}
            </span>
          </div>
        )}

        {/* Meal Category Badge over Image */}
        {recipe.meal_heading && !collection && (
          <div className="absolute top-3 left-3 z-10">
            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-900/80 text-white backdrop-blur-xs shadow-xs">
              {recipe.meal_heading}
            </span>
          </div>
        )}

        {/* Favorite indicator badge over image */}
        {recipe.is_favorite && (
          <div className="absolute top-3 right-3 z-10">
            <div className="w-6 h-6 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs flex items-center justify-center shadow-xs text-red-500">
              <Heart className="w-3.5 h-3.5 fill-red-500" />
            </div>
          </div>
        )}
      </Link>

      {/* Card Content */}
      <div className="p-4 flex-grow flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Subtle Category/Collection Label for Favorited Recipe */}
          {recipe.is_favorite && (
            <div className="flex items-center gap-1.5 mb-1">
              <span 
                className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs"
                style={{
                  backgroundColor: collection?.color ? `${collection.color}15` : "rgba(220, 38, 38, 0.08)",
                  borderColor: collection?.color ? `${collection.color}40` : "rgba(220, 38, 38, 0.25)",
                  color: collection?.color || "#dc2626",
                }}
              >
                <Heart className="w-2.5 h-2.5 fill-red-500 text-red-500 shrink-0" />
                <span className="truncate max-w-[150px]">{categoryLabel}</span>
              </span>
            </div>
          )}

          {/* Title and Action Buttons */}
          <div className="flex items-start justify-between gap-2">
            <Link to={`/recipes/${recipe.id}`} className="group-hover:text-red-600 transition-colors flex-grow">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 line-clamp-1 leading-snug">
                {recipe.title}
              </h3>
            </Link>
            
            {/* Action Buttons: Favorite and Edit */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  favoriteMutation.mutate();
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  recipe.is_favorite 
                    ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" 
                    : "text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                }`}
                title={recipe.is_favorite ? "Favorited (Click to remove)" : "Mark as Favorite"}
                aria-label={recipe.is_favorite ? "Favorited (Click to remove)" : "Mark as Favorite"}
              >
                <Heart className={`w-3.5 h-3.5 ${recipe.is_favorite ? "fill-red-500 text-red-500" : ""}`} />
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(recipe);
                }}
                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                title="Edit Recipe"
                id={`edit-recipe-${recipe.id}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Recipe Description (truncated) */}
          {recipe.description && (
            <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed font-sans">
              {recipe.description}
            </p>
          )}
        </div>

        {/* Footer info: Times, Servings, and Tags */}
        <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">
            {/* Total Prep / Cook Time */}
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{totalTime}</span>
            </div>

            {/* Servings */}
            {recipe.servings && (
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                <span>{recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {recipe.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-350 rounded-md text-[9px] font-bold uppercase tracking-wider"
                >
                  <Tag className="w-2 h-2 text-zinc-400" />
                  {tag}
                </span>
              ))}
              {recipe.tags.length > 3 && (
                <span className="px-1 py-0.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 rounded-md text-[8.5px] font-bold">
                  +{recipe.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
