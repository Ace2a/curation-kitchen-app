/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { recipeClient } from "../../api/recipeClient";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Collection, Recipe } from "../../types";

interface CollectionFormModalProps {
  open: boolean;
  onClose: () => void;
  collection: Collection | null;
  recipes: Recipe[];
}

const PRESET_COLORS = ["#c2410c", "#0369a1", "#15803d", "#7c3aed", "#be185d", "#b45309", "#0e7490"];

export default function CollectionFormModal({ open, onClose, collection, recipes }: CollectionFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setDescription(collection.description || "");
      setColor(collection.color || PRESET_COLORS[0]);
      setSelectedRecipeIds(collection.recipe_ids || []);
    } else {
      setName("");
      setDescription("");
      setColor(PRESET_COLORS[0]);
      setSelectedRecipeIds([]);
    }
  }, [collection, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description,
        color,
        recipe_ids: selectedRecipeIds
      };
      if (collection) {
        return recipeClient.collections.update(collection.id, payload);
      } else {
        return recipeClient.collections.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      onClose();
    }
  });

  const handleToggleRecipe = (id: string) => {
    setSelectedRecipeIds((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveMutation.mutate();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative z-50 w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-100"
          >
            {/* Top Color Bar */}
            <div className="h-2.5 w-full transition-colors duration-300" style={{ backgroundColor: color }} />

            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-xl font-bold font-sans text-zinc-900">
                {collection ? "Edit Collection" : "Create New Collection"}
              </h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl h-8 w-8">
                <X className="w-5 h-5 text-zinc-500" />
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Collection Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Grandma's Baking, Keto Dinner Prep"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full text-sm rounded-xl border border-zinc-200 p-3 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="What kind of recipes belong here?"
                />
              </div>

              {/* Theme Color Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                  Collection Color
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-8 h-8 rounded-full border border-black/5 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer relative"
                      style={{ backgroundColor: c }}
                    >
                      {color === c && (
                        <Check className="w-4 h-4 text-white drop-shadow-md" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Associate Recipes */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                  Select Recipes ({selectedRecipeIds.length} chosen)
                </label>
                {recipes.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">No recipes available. Create recipes first to add them here.</p>
                ) : (
                  <div className="border border-zinc-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-zinc-100 bg-zinc-50">
                    {recipes.map((recipe) => {
                      const isChecked = selectedRecipeIds.includes(recipe.id);
                      return (
                        <div
                          key={recipe.id}
                          onClick={() => handleToggleRecipe(recipe.id)}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-100 cursor-pointer transition-colors"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isChecked ? "bg-amber-600 border-amber-600 text-white" : "border-zinc-300 bg-white"
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          {recipe.image_url && (
                            <img
                              src={recipe.image_url}
                              alt={recipe.title}
                              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-800 truncate">{recipe.title}</p>
                            {recipe.tags && recipe.tags.length > 0 && (
                              <p className="text-xs text-zinc-400 truncate">{recipe.tags.join(", ")}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending || !name.trim()}>
                  {saveMutation.isPending ? "Saving..." : collection ? "Save Changes" : "Create Collection"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
