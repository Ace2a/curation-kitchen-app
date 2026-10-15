/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, Trash2, Home, Sparkles, Mic, MicOff } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../ui/button";
import { KitchenLogo } from "../ui/KitchenLogo";
import { Input } from "../ui/input";
import { recipeClient } from "../../api/recipeClient";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Recipe, Collection } from "../../types";
import { normalizeTimeStr } from "../../lib/timeUtils";

interface RecipeFormModalProps {
  open?: boolean;
  onClose?: () => void;
  recipe?: Recipe | null;
  collections?: Collection[];
  isPage?: boolean;
}

export default function RecipeFormModal({ open = true, onClose, recipe = null, collections = [], isPage = false }: RecipeFormModalProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get("q") || "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState<number>(2);
  const [imageUrl, setImageUrl] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [mealHeading, setMealHeading] = useState("dinner");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState("");
  const [instructions, setInstructions] = useState<string[]>([]);
  const [newInstruction, setNewInstruction] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // AI Global Search & Import States
  const [activeTab, setActiveTab] = useState<"search" | "manual" | "voice">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");

  // Voice Dictation States
  const [dictationText, setDictationText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [dictationError, setDictationError] = useState("");
  const [isParsingDictation, setIsParsingDictation] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const queryClient = useQueryClient();

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }
        if (finalTranscript) {
          setDictationText((prev) => prev + finalTranscript);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === "not-allowed") {
          setDictationError("Microphone access was denied. Please allow microphone access in your browser settings.");
        } else {
          setDictationError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      setDictationError("Speech recognition is not supported in this browser. Try using Google Chrome or Safari, or paste/type spoken instructions below.");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setDictationError("");
      try {
        recognition.start();
        setIsListening(true);
      } catch (err: any) {
        console.error("Failed to start recognition:", err);
        setDictationError("Could not start speech recognition. Please check your browser microphone permissions.");
      }
    }
  };

  const handleParseDictation = async () => {
    if (!dictationText.trim()) return;
    setIsParsingDictation(true);
    setDictationError("");

    try {
      const response = await fetch("/api/gemini/parse-dictation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: dictationText.trim() })
      });

      if (!response.ok) {
        throw new Error(`Failed to parse dictation: ${response.statusText}`);
      }

      const parsed = await response.json();

      setTitle(parsed.title || "");
      setDescription(parsed.description || "");
      setPrepTime(parsed.prep_time || "");
      setCookTime(parsed.cook_time || "");
      setServings(parsed.servings || 4);
      setImageUrl(parsed.image_url || "");
      setIngredients(parsed.ingredients || []);
      setInstructions(parsed.instructions || []);
      setTags(parsed.tags || []);
      
      const finalHeading = (parsed.meal_heading || "dinner").toLowerCase();
      setMealHeading(finalHeading);

      setActiveTab("manual");
    } catch (err: any) {
      console.error("Dictation parse error:", err);
      setDictationError(err.message || "Failed to format dictated recipe. Please try again or edit manually.");
    } finally {
      setIsParsingDictation(false);
    }
  };

  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title);
      setDescription(recipe.description || "");
      setPrepTime(recipe.prep_time || "");
      setCookTime(recipe.cook_time || "");
      setServings(recipe.servings || 2);
      setImageUrl(recipe.image_url || "");
      setCollectionId(recipe.collection_id || "");
      setMealHeading(recipe.meal_heading || "dinner");
      const formattedIngredients = (recipe.ingredients || []).map((item) => {
        if (typeof item === "string") return item;
        if (!item) return "";
        const parts: string[] = [];
        const amount = item.canonicalAmount ?? item.minAmount;
        if (amount !== undefined && amount !== null) parts.push(String(amount));
        if (item.unit) parts.push(item.unit);
        if (item.name) parts.push(item.name);
        if (item.modifiers && item.modifiers.length > 0) parts.push(`(${item.modifiers.join(", ")})`);
        return parts.length > 0 ? parts.join(" ") : (item.raw || "");
      });
      setIngredients(formattedIngredients);
      setInstructions(recipe.instructions || []);
      setTags(recipe.tags || []);
      setActiveTab("manual");
    } else {
      setTitle("");
      setDescription("");
      setPrepTime("15 mins");
      setCookTime("30 mins");
      setServings(4);
      setImageUrl("");
      setCollectionId("");
      setMealHeading("dinner");
      setIngredients([]);
      setInstructions([]);
      setTags([]);
      setActiveTab("search");
    }
    if (qParam && !recipe) {
      setSearchQuery(qParam);
    } else {
      setSearchQuery("");
    }
    setSearchResults([]);
    setSearchError("");
    setImportError("");
    setIsSearching(false);
    setIsImporting(false);
    setDictationText("");
    setIsListening(false);
    setDictationError("");
    setIsParsingDictation(false);
  }, [recipe, open, qParam]);

  useEffect(() => {
    if (qParam && !recipe && activeTab === "search") {
      const trimmed = qParam.trim();
      const isUrl = /^(https?:\/\/[^\s]+)$/i.test(trimmed);
      if (isUrl) {
        handleImport(trimmed);
      } else {
        const triggerSearch = async (query: string) => {
          setIsSearching(true);
          setSearchError("");
          setSearchResults([]);
          try {
            const response = await fetch("/api/gemini/search-recipes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: query.trim() })
            });
            if (!response.ok) {
              throw new Error(`Search failed: ${response.statusText}`);
            }
            const data = await response.json();
            setSearchResults(data);
          } catch (err: any) {
            console.error("Search error:", err);
            setSearchError(err.message || "Failed to search for recipes. Please try again.");
          } finally {
            setIsSearching(false);
          }
        };
        triggerSearch(trimmed);
      }
    }
  }, [qParam, recipe, activeTab]);

  const handleSearch = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    const isUrl = /^(https?:\/\/[^\s]+)$/i.test(trimmed);
    if (isUrl) {
      handleImport(trimmed);
      return;
    }

    setIsSearching(true);
    setSearchError("");
    setSearchResults([]);
    
    try {
      const response = await fetch("/api/gemini/search-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed })
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSearchResults(data);
    } catch (err: any) {
      console.error("Search error:", err);
      setSearchError(err.message || "Failed to search for recipes. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleImport = async (url: string, suggestedHeading?: string) => {
    setIsImporting(true);
    setImportError("");
    
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
      
      setTitle(parsed.title || "");
      setDescription(parsed.description || "");
      setPrepTime(parsed.prep_time || "");
      setCookTime(parsed.cook_time || "");
      setServings(parsed.servings || 4);
      setImageUrl(parsed.image_url || "");

      const rawIngredients = parsed.ingredients || parsed.formatted_ingredients || [];
      const formattedIngredients = rawIngredients.map((ing: any) =>
        typeof ing === "object"
          ? `${ing.amount || ""} ${ing.unit || ""} ${ing.name || ""}${ing.modifier ? ` (${ing.modifier})` : ""}`.replace(/\s+/g, " ").trim()
          : String(ing)
      );
      setIngredients(formattedIngredients);
      setInstructions(parsed.instructions || []);
      setTags(parsed.tags || []);
      
      const finalHeading = (parsed.meal_heading || suggestedHeading || "dinner").toLowerCase();
      setMealHeading(finalHeading);
      
      setActiveTab("manual");
    } catch (err: any) {
      console.error("Import error:", err);
      setImportError(err.message || "Failed to parse this recipe. Try copying the content or link manually.");
    } finally {
      setIsImporting(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        description,
        prep_time: normalizeTimeStr(prepTime),
        cook_time: normalizeTimeStr(cookTime),
        servings,
        image_url: imageUrl || undefined,
        collection_id: collectionId || undefined,
        meal_heading: mealHeading,
        ingredients,
        instructions,
        tags,
      };
      if (recipe) {
        return recipeClient.recipes.update(recipe.id, payload);
      } else {
        return recipeClient.recipes.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      onClose();
    },
  });

  const handleAddIngredient = () => {
    if (!newIngredient.trim()) return;
    setIngredients([...ingredients, newIngredient.trim()]);
    setNewIngredient("");
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleAddInstruction = () => {
    if (!newInstruction.trim()) return;
    setInstructions([...instructions, newInstruction.trim()]);
    setNewInstruction("");
  };

  const handleRemoveInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    if (!tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
    }
    setNewTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    saveMutation.mutate();
  };

  if (!open && !isPage) return null;

  const headerBlock = (
    <div className="px-6 py-4 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
          {recipe ? "Edit Recipe" : "Add New Recipe"}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {recipe ? "Update your recipe details." : "Search the web for recipes or add one manually."}
        </p>
      </div>
      {!isPage && onClose && (
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl h-8 w-8 cursor-pointer">
          <X className="w-5 h-5 text-zinc-500" />
        </Button>
      )}
    </div>
  );

  const tabsBlock = !recipe && (
    <div className="flex border-b border-zinc-150 dark:border-zinc-800 px-6 bg-zinc-50/50 dark:bg-zinc-900/50 flex-shrink-0">
      <button
        type="button"
        onClick={() => setActiveTab("search")}
        className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors relative cursor-pointer ${
          activeTab === "search"
            ? "border-amber-500 text-amber-600 dark:text-amber-400"
            : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        }`}
      >
        🌐 Global AI Search
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("voice")}
        className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors relative cursor-pointer flex items-center gap-1.5 ${
          activeTab === "voice"
            ? "border-amber-500 text-amber-600 dark:text-amber-400"
            : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        }`}
        id="voice-dictation-tab-btn"
      >
        🎤 Voice Dictation
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("manual")}
        className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors relative cursor-pointer ${
          activeTab === "manual"
            ? "border-amber-500 text-amber-600 dark:text-amber-400"
            : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        }`}
      >
        ✍️ Manual Entry
      </button>
    </div>
  );

  const formBody = (
    <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "voice" && !recipe ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-amber-500 animate-pulse" />
                      Recipe Voice Dictation
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Speak or dictate your recipe description, ingredients, and steps. Press the microphone button to start recording, speak naturally, and let Gemini AI format your speech automatically into a structured recipe!
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center py-6 px-4 bg-zinc-50 dark:bg-zinc-950/20 rounded-2xl border border-zinc-150 dark:border-zinc-850/80 space-y-4">
                    {/* Microphone Pulse Circle */}
                    <button
                      type="button"
                      onClick={toggleListening}
                      id="voice-mic-btn"
                      className={`relative flex items-center justify-center w-16 h-16 rounded-full cursor-pointer transition-all duration-300 shadow-md ${
                        isListening
                          ? "bg-red-500 text-white ring-4 ring-red-100 dark:ring-red-950/40 animate-pulse scale-105"
                          : "bg-amber-500 hover:bg-amber-600 text-white hover:scale-105"
                      }`}
                      title={isListening ? "Stop listening" : "Start dictating"}
                    >
                      {isListening ? (
                        <MicOff className="w-7 h-7" />
                      ) : (
                        <Mic className="w-7 h-7" />
                      )}
                      
                      {/* Radiating rings when listening */}
                      {isListening && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping -z-10" />
                      )}
                    </button>

                    <div className="text-center">
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        isListening ? "text-red-500 animate-pulse" : "text-zinc-500"
                      }`}>
                        {isListening ? "Listening... Speak now" : "Microphone Idle"}
                      </span>
                      {!(window as any).SpeechRecognition && !(window as any).webkitSpeechRecognition && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 max-w-xs">
                          Speech Recognition API is not supported on this browser. You can type or paste spoken notes in the text area below instead!
                        </p>
                      )}
                    </div>
                  </div>

                  {dictationError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 text-left">
                      {dictationError}
                    </div>
                  )}

                  {/* Transcript textarea */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Spoken Transcript / Notes
                      </label>
                      {dictationText && (
                        <button
                          type="button"
                          onClick={() => setDictationText("")}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold"
                        >
                          Clear Transcript
                        </button>
                      )}
                    </div>
                    <textarea
                      value={dictationText}
                      onChange={(e) => setDictationText(e.target.value)}
                      placeholder="e.g. 'I want to make a quick banana smoothie. We will need two ripe bananas, one cup of almond milk, a tablespoon of honey, and a pinch of cinnamon. Blend everything in a high-speed blender for 1 minute until completely smooth and serve chilled...'"
                      rows={6}
                      className="w-full text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 placeholder:text-zinc-450 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed text-left"
                    />
                  </div>

                  {isParsingDictation && (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4 bg-zinc-50 dark:bg-zinc-950/20 rounded-2xl border border-dashed border-amber-300 dark:border-zinc-800">
                      <div className="relative flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                        <span className="absolute text-lg">🎙️</span>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Gemini is parsing your voice dictation...</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Extracting ingredients, structured steps, times, and servings...</p>
                      </div>
                    </div>
                  )}

                  {!isParsingDictation && dictationText.trim() && (
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        onClick={handleParseDictation}
                        className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 px-6 py-2.5 h-auto cursor-pointer"
                        id="parse-dictation-btn"
                      >
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        <span>Format Recipe with Gemini</span>
                      </Button>
                    </div>
                  )}
                </div>
              ) : activeTab === "search" && !recipe ? (
                <div className="space-y-6">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSearch();
                    }}
                    className="space-y-3"
                  >
                    <div className="flex gap-2">
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search any dish, website, or culinary idea..."
                        className="rounded-xl flex-1 text-sm font-medium h-11"
                        autoFocus
                      />
                      <Button 
                        type="submit"
                        disabled={isSearching || !searchQuery.trim()}
                        className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center gap-1.5 h-11 px-6 cursor-pointer"
                      >
                        {isSearching ? "Searching..." : "Search"}
                      </Button>
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Search recipes globally across all food blogs and cultures. Preview matching results and click <strong>Import & Edit</strong> to save directly into your library.
                    </p>
                  </form>

                  {searchError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400">
                      {searchError}
                    </div>
                  )}

                  {isImporting && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-zinc-50 dark:bg-zinc-950/20 rounded-2xl border border-dashed border-amber-300 dark:border-zinc-800">
                      <div className="relative flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                        <span className="absolute text-lg">🍲</span>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Importing and parsing recipe details...</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Analyzing ingredients, scaling instructions, and detecting meal heading...</p>
                      </div>
                    </div>
                  )}

                  {importError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400">
                      {importError}
                    </div>
                  )}

                  {!isImporting && searchResults.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Search Results ({searchResults.length})
                      </h4>
                      
                      <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
                        {searchResults.map((res: any, idx: number) => {
                          const headingEmoji: Record<string, string> = {
                            breakfast: "🍳 Breakfast",
                            lunch: "🥗 Lunch",
                            dinner: "🍲 Dinner",
                            snacks: "🍪 Snacks",
                            desserts: "🍰 Desserts",
                            etc: "🥐 Others (ETC.)"
                          };
                          const headingVal = (res.meal_heading || "dinner").toLowerCase();
                          const headingLabel = headingEmoji[headingVal] || "🍲 Dinner";

                          return (
                            <div 
                              key={idx} 
                              className="p-4 bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-150 dark:border-zinc-800/85 rounded-xl hover:border-amber-400 transition-all flex flex-col sm:flex-row gap-4 items-start justify-between"
                            >
                              <div className="space-y-1.5 flex-1 text-left">
                                <div className="flex flex-wrap gap-2 items-center">
                                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    {res.source || "Web"}
                                  </span>
                                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    {headingLabel}
                                  </span>
                                </div>
                                <h5 className="font-bold text-zinc-900 dark:text-white leading-tight">
                                  {res.title}
                                </h5>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                                  {res.description}
                                </p>
                                <div className="flex gap-4 text-[11px] text-zinc-450 font-semibold">
                                  {res.prepTime && <span>Prep: {res.prepTime}</span>}
                                  {res.cookTime && <span>Cook: {res.cookTime}</span>}
                                </div>
                              </div>
                              
                              <Button
                                type="button"
                                onClick={() => handleImport(res.url, res.meal_heading)}
                                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs px-4 py-2 self-stretch sm:self-center h-auto font-semibold"
                              >
                                Import & Edit
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {!isSearching && !isImporting && searchResults.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-400 dark:text-zinc-600 space-y-2">
                      <span className="text-3xl">🌐</span>
                      <p className="text-sm font-semibold">Search recipes globally to begin</p>
                      <p className="text-xs max-w-sm">Type any dish, cuisine type, or culinary idea, and we will find recipes from authentic sources ready to import.</p>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Recipe Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Grandma's Famous Lasagna"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Brief Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Give a quick, delicious summary of this meal"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Prep Time
                    </label>
                    <Input
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value)}
                      placeholder="e.g. 15 mins"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Cook Time
                    </label>
                    <Input
                      value={cookTime}
                      onChange={(e) => setCookTime(e.target.value)}
                      placeholder="e.g. 30 mins"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Servings
                    </label>
                    <Input
                      type="number"
                      value={servings}
                      onChange={(e) => setServings(Number(e.target.value))}
                      placeholder="e.g. 4"
                      min={1}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Collection
                    </label>
                    <select
                      value={collectionId}
                      onChange={(e) => setCollectionId(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="">Unassigned (Master Library)</option>
                      {collections.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Meal Heading / Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={mealHeading}
                      onChange={(e) => setMealHeading(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer font-medium"
                      required
                    >
                      <option value="breakfast">Breakfast 🍳</option>
                      <option value="lunch">Lunch 🥗</option>
                      <option value="dinner">Dinner 🍲</option>
                      <option value="snacks">Snacks 🍪</option>
                      <option value="desserts">Desserts 🍰</option>
                      <option value="etc">Others (ETC.) 🥐</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Image URL (Optional)
                    </label>
                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                </div>

                {/* Ingredients List Builder */}
                <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Ingredients
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={newIngredient}
                      onChange={(e) => setNewIngredient(e.target.value)}
                      placeholder="e.g. 2 cups of shredded mozzarella"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddIngredient();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddIngredient} className="rounded-xl flex-shrink-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {ingredients.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/55 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      {ingredients.map((ing, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-850 px-3 py-1.5 rounded-lg text-sm">
                          <span className="text-zinc-700 dark:text-zinc-300 truncate pr-2">{ing}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(idx)}
                            className="text-red-500 hover:text-red-700 p-0.5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Instructions Steps Builder */}
                <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Step-by-Step Instructions
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      value={newInstruction}
                      onChange={(e) => setNewInstruction(e.target.value)}
                      placeholder="e.g. Pre-heat oven to 375°F and line baking tray."
                      rows={2}
                      className="w-full text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddInstruction();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddInstruction} className="rounded-xl flex-shrink-0 self-end h-10">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {instructions.length > 0 && (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/55 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      {instructions.map((inst, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-850 px-3 py-2 rounded-lg text-sm">
                          <span className="font-bold text-amber-600 dark:text-amber-500 flex-shrink-0">{idx + 1}.</span>
                          <span className="text-zinc-700 dark:text-zinc-300 text-left flex-1 text-xs sm:text-sm">{inst}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveInstruction(idx)}
                            className="text-red-500 hover:text-red-700 p-0.5 flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tags section */}
                <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Category Tags
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="e.g. Vegan, Comfort Food, Italian"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddTag} className="rounded-xl flex-shrink-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-zinc-800 border border-amber-100 dark:border-zinc-700 rounded-full text-xs font-medium text-amber-800 dark:text-amber-400"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-amber-650 hover:text-red-600 font-bold"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending || !title.trim()}>
                    {saveMutation.isPending ? "Saving..." : recipe ? "Save Changes" : "Save Recipe"}
                  </Button>
                </div>
              </form>
            )}
    </div>
  );

  if (isPage) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col" id="recipe-form-page-container">
        {/* Top Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
          <div className="max-w-3xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
            {/* Left: Home Button */}
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 cursor-pointer">
                <Home className="w-3.5 h-3.5 text-zinc-500" />
                <span>Home</span>
              </Button>
            </Link>

            {/* Center: Title */}
            <h1 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider">
              {recipe ? "Edit Recipe" : "Add Recipe"}
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

        <div className="max-w-3xl w-full mx-auto px-4 py-8 flex-grow flex flex-col">
          <div className="relative w-full rounded-2xl bg-white dark:bg-zinc-900 shadow-md border border-zinc-100 dark:border-zinc-800 flex flex-col overflow-hidden" id="recipe-form-page-content">
            {headerBlock}
            {tabsBlock}
            {formBody}
          </div>
        </div>
      </div>
    );
  }

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
            className="relative z-50 w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-100 dark:border-zinc-800"
          >
            {headerBlock}
            {tabsBlock}
            {formBody}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
