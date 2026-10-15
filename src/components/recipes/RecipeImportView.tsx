import React, { useState } from "react";
import { Sparkles, ArrowLeft, CheckCircle2, FileText, Loader2, Save, Clock, Users, Eye, PlusCircle, Code, X } from "lucide-react";
import { recipeClient } from "../../api/recipeClient";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

interface ParsedRecipeResult {
  recipe_name?: string;
  title?: string;
  description?: string;
  ingredients?: any[];
  steps?: any[];
  instructions?: any[];
  formatted_ingredients?: string[];
  prep_time?: string;
  cook_time?: string;
  servings?: number;
}

interface RecipeImportViewProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function RecipeImportView({ onClose, onSuccess }: RecipeImportViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedRecipeResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const formatIngredientItem = (ing: any): string => {
    if (ing === null || ing === undefined) return "";
    if (typeof ing === "string") return ing;
    if (typeof ing === "number") return String(ing);
    if (typeof ing === "object") {
      const qty = ing.quantity !== undefined ? ing.quantity : (ing.amount !== undefined ? ing.amount : "");
      const unit = ing.unit || "";
      const name = ing.name || "";
      let mods = "";
      if (Array.isArray(ing.modifiers)) {
        mods = ing.modifiers.filter(Boolean).join(", ");
      } else if (typeof ing.modifiers === "string") {
        mods = ing.modifiers;
      } else if (typeof ing.modifier === "string") {
        mods = ing.modifier;
      }
      return `${qty} ${unit} ${name}${mods ? ` (${mods})` : ""}`.replace(/\s+/g, " ").trim();
    }
    return String(ing);
  };

  const formatStepItem = (step: any): string => {
    if (step === null || step === undefined) return "";
    if (typeof step === "string") return step;
    if (typeof step === "object") {
      return step.text || step.instruction || step.step || JSON.stringify(step);
    }
    return String(step);
  };

  const handleProcessAndImport = async () => {
    // 1. Capture the text string currently typed inside the ingestion text area
    const blogText = rawText.trim();
    if (!blogText) {
      setError("Please paste a raw text recipe or food blog post to process.");
      return;
    }

    setError(null);
    setSuccessNotice(null);
    setIsLoading(true);
    setParsedResult(null);
    setIsSaved(false);
    setSavedRecipeId(null);

    try {
      // 2. Send an asynchronous fetch POST request to endpoint at '/api/recipes/ingest'
      // 3. Pass payload inside request body as JSON under exact key 'rawBlogText'
      const response = await fetch("/api/recipes/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawBlogText: blogText,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}. Failed to parse recipe.`);
      }

      const data = await response.json();

      // 4. Display a success notice when the recipe successfully updates the database arrays
      setParsedResult(data);
      setSuccessNotice("Recipe processed successfully and ingredients linked to Pantry Hub!");
    } catch (err: any) {
      console.error("Recipe import error:", err);
      // Handle network errors gracefully
      setError(err.message || "A network error occurred while ingesting the recipe.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToCollection = async () => {
    if (!parsedResult) return;
    setIsSaving(true);
    setError(null);
    try {
      const rawIngs = parsedResult.formatted_ingredients || parsedResult.ingredients || [];
      const ingStrings = rawIngs.map(formatIngredientItem).filter(Boolean);

      const rawSteps = parsedResult.steps || parsedResult.instructions || [];
      const stepStrings = rawSteps.map(formatStepItem).filter(Boolean);

      const title = parsedResult.recipe_name || parsedResult.title || "Imported Recipe";

      const created = await recipeClient.recipes.create({
        title,
        description: parsedResult.description || "Imported via AI recipe parser engine.",
        prep_time: parsedResult.prep_time || "15 mins",
        cook_time: parsedResult.cook_time || "25 mins",
        servings: parsedResult.servings || 4,
        ingredients: ingStrings,
        instructions: stepStrings,
        tags: ["AI Import", "Parsed"],
        is_favorite: false,
      });

      setIsSaved(true);
      if (created && created.id) {
        setSavedRecipeId(created.id);
      }
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Save error:", err);
      setError("Failed to save imported recipe to your collection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetForNew = () => {
    setParsedResult(null);
    setIsSaved(false);
    setSavedRecipeId(null);
    setRawText("");
  };

  const ingredientsList = (parsedResult?.formatted_ingredients || parsedResult?.ingredients || []).map(formatIngredientItem);
  const stepsList = (parsedResult?.steps || parsedResult?.instructions || []).map(formatStepItem);

  return (
    <div className="w-full max-w-2xl mx-auto bg-black/70 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 sm:p-6 text-white shadow-2xl space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-serif font-bold text-white leading-tight">
              Recipe Import &amp; Extraction Engine
            </h2>
            <p className="text-xs text-stone-300 font-medium">
              AI-powered recipe text and blog importer
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}
      </div>

      {/* Input Section */}
      <div className="space-y-2">
        <label className="block text-xs font-extrabold uppercase tracking-wider text-emerald-400">
          Raw Recipe Text / Food Blog Input
        </label>
        
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste your raw text recipe, ingredients list, or food blog post here..."
          className="w-full h-[140px] p-3.5 rounded-xl bg-black/50 border border-white/20 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 text-sm text-stone-100 placeholder-stone-400 resize-none font-sans outline-none transition-all shadow-inner"
        />

        {error && (
          <p className="text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-lg">
            {error}
          </p>
        )}

        {successNotice && (
          <p className="text-xs text-emerald-300 font-semibold bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </p>
        )}
      </div>

      <button
        onClick={handleProcessAndImport}
        disabled={isLoading || !rawText.trim()}
        className="w-full h-[48px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg cursor-pointer active:scale-[0.99]"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-emerald-200" />
            <span>Parsing Recipe with Gemini AI...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <span>Process &amp; Import Recipe</span>
          </>
        )}
      </button>

      {/* Parsed Result View */}
      {parsedResult && (
        <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 space-y-4 animate-fadeIn shadow-xl">
          <div className="flex flex-wrap items-center justify-between border-b border-emerald-500/30 pb-3 gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-0.5">
                Parsed Recipe Result
              </span>
              <h3 className="text-base sm:text-lg font-serif font-bold text-emerald-200 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{parsedResult.recipe_name || parsedResult.title || "Parsed Recipe"}</span>
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md font-bold border border-emerald-500/30">
                Recipe Extracted
              </span>
            </div>
          </div>

          {/* Description if present */}
          {parsedResult.description && (
            <p className="text-xs text-stone-300 italic leading-relaxed">
              "{parsedResult.description}"
            </p>
          )}

          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="px-3 py-1 rounded-lg bg-black/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Prep: {parsedResult.prep_time || "15 mins"}</span>
            </span>
            <span className="px-3 py-1 rounded-lg bg-black/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Cook: {parsedResult.cook_time || "25 mins"}</span>
            </span>
            <span className="px-3 py-1 rounded-lg bg-black/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-teal-400" />
              <span>Servings: {parsedResult.servings || 4}</span>
            </span>
          </div>

          {/* Structured Ingredients */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-200 uppercase tracking-wider flex items-center justify-between">
              <span>Ingredients List</span>
              <span className="text-[10px] font-mono font-bold bg-black/40 px-2 py-0.5 rounded text-emerald-400 border border-emerald-500/30">
                {ingredientsList.length} items
              </span>
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-200">
              {ingredientsList.map((ingStr, idx) => (
                <li key={idx} className="bg-black/40 border border-white/10 px-3 py-2 rounded-xl flex items-start gap-2.5 leading-snug">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                  <span className="break-words font-medium">{ingStr}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-200 uppercase tracking-wider flex items-center justify-between">
              <span>Instructions ({stepsList.length} steps)</span>
            </h4>
            <ol className="space-y-2 text-xs text-stone-200">
              {stepsList.map((stepStr, idx) => (
                <li key={idx} className="bg-black/40 border border-white/10 p-3 rounded-xl flex gap-3 items-start">
                  <span className="font-bold text-emerald-400 font-mono text-xs shrink-0 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed font-medium pt-0.5">{stepStr}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Save Action / Cancel Buttons */}
          <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-3">
            {isSaved ? (
              <div className="w-full flex flex-wrap items-center justify-between gap-2 p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Recipe Saved to Kitchen Collection!
                </span>

                <div className="flex items-center gap-2">
                  {savedRecipeId && (
                    <button
                      onClick={() => {
                        if (onClose) onClose();
                        navigate(`/recipes/${savedRecipeId}`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Saved Recipe</span>
                    </button>
                  )}
                  <button
                    onClick={handleResetForNew}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-stone-600"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Import Another</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleResetForNew();
                    if (onClose) onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700/80 text-stone-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
                >
                  <X className="w-4 h-4 text-stone-400" />
                  <span>Cancel / Discard</span>
                </button>

                <button
                  onClick={handleSaveToCollection}
                  disabled={isSaving}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs px-5 py-2.5 flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.98]"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save to My Recipe Collection</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

