/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { recipeClient } from "../../api/recipeClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { 
  Home, Plus, Folder, Pencil, Trash2, BookOpen, Share2, ArrowLeft, Search, X, Loader2, Globe, Sparkles, Utensils
} from "lucide-react";
import { motion } from "motion/react";
import CollectionFormModal from "./CollectionFormModal";
import CollectionExportModal from "./CollectionExportModal";
import RecipeCard from "../recipes/RecipeCard";
import RecipeFormModal from "../recipes/RecipeFormModal";
import { KitchenLogo } from "../ui/KitchenLogo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Collection, Recipe } from "../../types";

export const DEFAULT_COLLECTIONS: Collection[] = [
  {
    id: "col-favorites",
    name: "Favorites",
    description: "Your most-loved and bookmarked kitchen recipes",
    color: "#e11d48",
    recipe_ids: [],
    created_date: new Date().toISOString(),
  },
  {
    id: "col-weeknight-dinners",
    name: "Weeknight Dinners",
    description: "Quick, hassle-free meals ready in under 30 minutes",
    color: "#f59e0b",
    recipe_ids: [],
    created_date: new Date().toISOString(),
  },
  {
    id: "col-custom",
    name: "Custom Collections",
    description: "Curated seasonal menus and special occasion folders",
    color: "#6366f1",
    recipe_ids: [],
    created_date: new Date().toISOString(),
  },
];

export default function Collections() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "all-recipes" ? "all-recipes" : "collections";
  const initialColId = searchParams.get("collection") || null;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [exportCollection, setExportCollection] = useState<Collection | null>(null);
  const [selectedColId, setSelectedColId] = useState<string | null>(initialColId);
  const [activeTab, setActiveTab] = useState<"collections" | "all-recipes">(initialTab);
  const [textSearch, setTextSearch] = useState("");

  const queryClient = useQueryClient();

  const { data: collections = [], isLoading: isCollectionsLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: () => recipeClient.collections.list("-created_date"),
  });

  const { data: recipes = [], isLoading: isRecipesLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => recipeClient.recipes.list("-created_date"),
  });

  const isLoading = isCollectionsLoading || isRecipesLoading;

  const deleteCollection = useMutation({
    mutationFn: (id: string) => recipeClient.collections.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      if (selectedColId === id) {
        setSelectedColId(null);
      }
    },
  });

  const openEdit = (col: Collection) => {
    setEditing(col);
    setModalOpen(true);
  };
  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    navigate("/recipes/edit/" + recipe.id);
  };

  // Helper to accurately map recipes to a collection via col.recipe_ids, recipe.collection_id, or template criteria
  const getCollectionRecipes = (col?: Collection | null): Recipe[] => {
    if (!col) return [];
    if (col.id === "col-favorites") {
      return recipes.filter((r) => r.is_favorite || col.recipe_ids?.includes(r.id));
    }
    if (col.id === "col-weeknight-dinners") {
      return recipes.filter(
        (r) =>
          r.tags?.some((t) =>
            ["dinner", "quick", "weeknight", "easy", "30 mins", "15 mins"].some((tag) =>
              t.toLowerCase().includes(tag)
            )
          ) ||
          r.meal_heading?.toLowerCase() === "dinner" ||
          col.recipe_ids?.includes(r.id)
      );
    }
    if (col.id === "col-custom") {
      return recipes.filter(
        (r) =>
          Boolean(r.collection_id) &&
          r.collection_id !== "col-favorites" &&
          r.collection_id !== "col-weeknight-dinners"
      );
    }
    return recipes.filter((recipe) => {
      const inCollectionIds = col.recipe_ids?.includes(recipe.id);
      const matchDirectId = recipe.collection_id === col.id;
      return inCollectionIds || matchDirectId;
    });
  };

  // Merge global system folder templates ("Favorites", "Weeknight Dinners", "Custom Collections") with user collections
  const displayCollections: Collection[] = useMemo(() => {
    const userNames = new Set(collections.map((c) => c.name.toLowerCase()));
    const systemTemplates = DEFAULT_COLLECTIONS.filter(
      (def) => !userNames.has(def.name.toLowerCase())
    );
    return [...systemTemplates, ...collections];
  }, [collections]);

  const activeCol = displayCollections.find((c) => c.id === selectedColId) || collections.find((c) => c.id === selectedColId);

  // Filter recipes for the active collection or the "All Recipes" view
  const getFilteredRecipes = () => {
    let list = recipes;
    if (selectedColId && activeCol) {
      list = getCollectionRecipes(activeCol);
    }

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

  const filteredRecipes = getFilteredRecipes();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
      <div>
        {/* Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Left: Home Button & Title */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-3">
              <div className="flex items-center gap-3">
                <Link to="/">
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 cursor-pointer">
                    <Home className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Home</span>
                  </Button>
                </Link>

                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-600 flex items-center justify-center shadow-xs shrink-0">
                    <Folder className="w-3 h-3 text-white" />
                  </div>
                  <h1 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider truncate">
                    {activeCol ? "Collection Details" : "Culinary Library"}
                  </h1>
                </div>
              </div>

              {/* Mobile Kitchen Logo */}
              <Link to="/" className="flex sm:hidden items-center group shrink-0" title="Back to Home">
                <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-red-600 via-orange-500 to-amber-500 shadow-md ring-1 ring-red-100 dark:ring-red-950/40 overflow-hidden">
                  <KitchenLogo className="w-4 h-4 text-white" plateColor="white" letterColor="white" />
                </div>
              </Link>
            </div>

            {/* Right: Actions and Logo */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {!activeCol && (
                <Button onClick={openNew} className="w-full sm:w-auto justify-center gap-2 rounded-xl font-bold uppercase text-[10px] tracking-wider bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs py-2 px-3">
                  <Plus className="w-3.5 h-3.5" /> New Collection
                </Button>
              )}

              {/* Desktop Kitchen Logo */}
              <Link to="/" className="hidden sm:flex items-center group shrink-0" title="Back to Home">
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
          </div>
        </header>

        {/* Subheader (Only visible if not viewing a specific collection) */}
        {!selectedColId && (
          <div className="bg-white border-b border-zinc-200/60 dark:bg-zinc-900 dark:border-zinc-800/80 py-3.5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                  Folder Categories ({displayCollections.length})
                </span>
                <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
                  • Click a folder category to explore its recipes
                </span>
              </div>
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* VIEWING A SPECIFIC COLLECTION SUB-VIEW */}
          {selectedColId && activeCol ? (
            <div className="space-y-6">
              {/* Back navigation & Collection Details block */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedColId(null);
                      setTextSearch("");
                    }}
                    className="gap-2 rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-bold text-xs cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Library
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                      onClick={() => setExportCollection(activeCol)}
                      title="Export Collection"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    {!activeCol.id.startsWith("col-") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                        onClick={() => openEdit(activeCol)}
                        title="Edit Collection"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {!activeCol.id.startsWith("col-") && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                            title="Delete Collection"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{activeCol.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete the collection but keep all recipes intact in your master library.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteCollection.mutate(activeCol.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>

                <div className="space-y-2 border-l-4 pl-4" style={{ borderColor: activeCol.color || "#dc2626" }}>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white">{activeCol.name}</h2>
                  {activeCol.description ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
                      {activeCol.description}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">No description provided for this collection.</p>
                  )}
                </div>

                {/* Sub-view search & action controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="relative max-w-xs w-full">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search recipes inside..."
                      value={textSearch}
                      onChange={(e) => setTextSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:border-red-500 font-semibold"
                    />
                    {textSearch && (
                      <button 
                        onClick={() => setTextSearch("")}
                        className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <Button
                    onClick={() => navigate("/local-search")}
                    title="Search recipes across global index"
                    className="gap-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs flex flex-col items-center py-2 h-auto"
                  >
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-4 h-4" /> Global Search
                    </div>
                    <span className="text-[10px] font-normal opacity-90">Search recipes globally</span>
                  </Button>
                </div>
              </div>

              {/* Recipes Grid */}
              {filteredRecipes.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white dark:bg-zinc-900 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800/80 p-6 sm:p-8 space-y-3 shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-850 flex items-center justify-center mx-auto text-2xl">
                    🗂️
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      {textSearch 
                        ? "No matching recipes found"
                        : activeCol.id === "col-custom"
                        ? "No Custom Folders Yet"
                        : "Folder contains 0 recipes"}
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                      {textSearch 
                        ? "Try clearing your search query to see all collection recipes."
                        : activeCol.id === "col-favorites"
                        ? "Bookmark your favorite recipes with the heart icon to have them appear here."
                        : activeCol.id === "col-weeknight-dinners"
                        ? "Add quick weeknight dinner recipes to access them on busy evenings."
                        : activeCol.id === "col-custom"
                        ? "Organize your kitchen favorites by creating folders and adding recipes."
                        : "This collection folder is currently empty. Add your first recipe to get started!"}
                    </p>
                  </div>
                  {!textSearch && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <Button 
                        onClick={() => {
                          if (activeCol.id === "col-custom") {
                            openNew();
                          } else {
                            navigate("/recipes/new");
                          }
                        }} 
                        className="min-h-[36px] px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs"
                      >
                        {activeCol.id === "col-custom" ? "+ Create Custom Folder" : "+ Add First Recipe"}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredRecipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      collections={collections}
                      onEdit={handleEditRecipe}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* FOLDER CATEGORIES ONLY (No loose recipe cards on this main library screen) */
            <div>
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-pulse h-48" />
                    ))}
                </div>
              ) : displayCollections.length === 0 ? (
                <div className="text-center py-24 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-4 shadow-xs">
                  <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-850 flex items-center justify-center mx-auto">
                    <Folder className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-200">No collections yet</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    Create custom collections to group and organize your culinary masterpieces together.
                  </p>
                  <Button onClick={openNew} className="gap-2 mt-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs">
                    <Plus className="w-4 h-4" /> Create Your First Collection
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayCollections.map((col, i) => {
                    const colRecipes = getCollectionRecipes(col);
                    const recipeCount = colRecipes.length;
                    const previewRecipes = colRecipes.slice(0, 3);
                    return (
                      <motion.div
                        key={col.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => setSelectedColId(col.id)}
                        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden cursor-pointer group hover:-translate-y-0.5 duration-200"
                        id={`collection-card-${col.id}`}
                      >
                        <div>
                          {/* Color bar indicator */}
                          <div className="h-2" style={{ backgroundColor: col.color || "#c2410c" }} />

                          <div className="p-5">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0">
                                <h3 className="text-base font-black text-zinc-900 dark:text-white truncate group-hover:text-red-600 transition-colors">
                                  {col.name}
                                </h3>
                                {col.description && (
                                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                                    {col.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExportCollection(col);
                                  }}
                                  title="Export Collection"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </Button>
                                {!col.id.startsWith("col-") && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEdit(col);
                                    }}
                                    title="Edit Collection"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {!col.id.startsWith("col-") && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-red-500 hover:text-red-750 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                        title="Delete Collection"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete "{col.name}"?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will delete the collection but keep all recipes intact in your master library.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteCollection.mutate(col.id)}>Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </div>

                            {/* Recipe preview thumbnails */}
                            {previewRecipes.length > 0 ? (
                              <div className="flex gap-2 mt-4 mb-3">
                                {previewRecipes.map((r) => (
                                  <div key={r.id} className="flex-1 aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-850 max-w-[72px] border border-zinc-150 dark:border-zinc-800 shadow-xs relative group/thumb">
                                    {r.image_url ? (
                                      <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-800 dark:to-zinc-850 text-center">
                                        <Utensils className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mb-0.5" />
                                        <span className="text-[7.5px] font-extrabold text-zinc-700 dark:text-zinc-300 line-clamp-1 leading-none">{r.title}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-4 mb-3 p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-850/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800/80 flex flex-col items-center justify-center text-center gap-1.5">
                                <span className="text-xl" role="img" aria-label="folder">🗂️</span>
                                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                  {col.id === "col-custom" ? "No Custom Folders Yet" : "0 Recipes in Folder"}
                                </h4>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs leading-snug">
                                  {col.id === "col-favorites" 
                                    ? "Save favorite recipes using the heart icon to see them here."
                                    : col.id === "col-weeknight-dinners"
                                    ? "Quick and easy dinners under 30 minutes appear in this folder."
                                    : col.id === "col-custom"
                                    ? "Create dedicated folders to organize menus and holiday dinners."
                                    : "Start curating this collection with your favorite recipes."}
                                </p>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (col.id === "col-custom") {
                                      openNew();
                                    } else {
                                      navigate("/recipes/new");
                                    }
                                  }}
                                  className="min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 cursor-pointer shadow-2xs mt-1"
                                >
                                  {col.id === "col-custom" ? "+ Create Custom Folder" : "+ Add First Recipe"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="px-5 pb-5 pt-3 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                          <span className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-450">
                            {recipeCount} recipe{recipeCount !== 1 ? "s" : ""}
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl text-xs min-h-[36px] px-4 font-bold border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedColId(col.id);
                            }}
                          >
                            View Recipes
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* COLLECTION MODALS */}
      <CollectionExportModal
        open={!!exportCollection}
        onClose={() => setExportCollection(null)}
        collection={exportCollection}
        recipes={recipes}
      />

      <CollectionFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        collection={editing}
        recipes={recipes}
      />
    </div>
  );
}
