/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeClient } from "../../api/recipeClient";
import { formatTotalTime, normalizeTimeStr } from "../../lib/timeUtils";
import { checkIngredientPantryMatch } from "../../lib/pantryUtils";
import { Button } from "../ui/button";
import { 
  ArrowLeft, Home, Clock, Users, Tag, Pencil, Trash2, Sparkles, BookOpen, AlertCircle, 
  RotateCcw, CheckSquare, Square, Mic, MicOff, Volume2, VolumeX, SkipForward, 
  SkipBack, Play, Pause, HelpCircle, Heart, ChefHat, X, Flame, ChevronRight, ChevronLeft, Utensils, Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import RecipeFormModal from "./RecipeFormModal";
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
import { Recipe } from "../../types";

export default function RecipeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [multiplier, setMultiplier] = useState<number>(1);

  // Dedicated Cooking Mode State
  const [cookingMode, setCookingMode] = useState<boolean>(false);
  const [cookingStepIndex, setCookingStepIndex] = useState<number>(0);

  // Gemini modification states
  const [aiInstruction, setAiInstruction] = useState("");
  const [isModifying, setIsModifying] = useState(false);
  const [aiError, setAiError] = useState("");
  const [modifiedRecipePreview, setModifiedRecipePreview] = useState<Partial<Recipe> | null>(null);

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => recipeClient.recipes.list("-created_date"),
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => recipeClient.collections.list("-created_date"),
  });

  const { data: pantryItems = [] } = useQuery({
    queryKey: ["pantry"],
    queryFn: () => recipeClient.pantry.list(),
  });

  const recipe = recipes.find((r) => r.id === id);
  const collection = collections.find((c) => c.id === recipe?.collection_id);

  const displayRecipe = (modifiedRecipePreview && recipe)
    ? { ...recipe, ...modifiedRecipePreview }
    : (recipe || null);

  const rawInstructions: any[] = displayRecipe
    ? (Array.isArray(displayRecipe.instructions)
        ? displayRecipe.instructions
        : Array.isArray((displayRecipe as any).steps)
        ? (displayRecipe as any).steps
        : [])
    : [];

  const instructions: string[] = rawInstructions.map((step: any) =>
    typeof step === "object" && step !== null
      ? String(step.text || step.instruction || step.step || JSON.stringify(step))
      : String(step || "")
  );

  const rawIngredients: any[] = displayRecipe
    ? (Array.isArray(displayRecipe.ingredients)
        ? displayRecipe.ingredients
        : [])
    : [];

  const deleteMutation = useMutation({
    mutationFn: (recipeId: string) => recipeClient.recipes.delete(recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      navigate("/");
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async (isFav: boolean) => {
      if (!recipe) return;
      return recipeClient.recipes.update(recipe.id, { is_favorite: isFav });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  const saveModifiedMutation = useMutation({
    mutationFn: async (updated: Partial<Recipe>) => {
      if (!id) return;
      const normalizedPayload = {
        ...updated,
        prep_time: updated.prep_time !== undefined ? normalizeTimeStr(updated.prep_time) : undefined,
        cook_time: updated.cook_time !== undefined ? normalizeTimeStr(updated.cook_time) : undefined,
      };
      return recipeClient.recipes.update(id, normalizedPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      setModifiedRecipePreview(null);
      setAiInstruction("");
      setCheckedIngredients({});
      setActiveStep(null);
    },
  });

  // Hands-Free Mode States
  const [handsFreeActive, setHandsFreeActive] = useState(false);
  const [showVoiceCommandsHelp, setShowVoiceCommandsHelp] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState("");
  const [recognitionError, setRecognitionError] = useState("");

  const activeStepRef = useRef<number | null>(activeStep);
  const instructionsRef = useRef<string[]>(instructions);
  const handsFreeActiveRef = useRef<boolean>(handsFreeActive);
  const recognitionRef = useRef<any>(null);

  // Keep refs up-to-date
  activeStepRef.current = activeStep;
  instructionsRef.current = instructions;
  handsFreeActiveRef.current = handsFreeActive;

  const speakText = (text: string) => {
    if (!text) return;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(true);

      const utterance = new SpeechSynthesisUtterance(text);
      
      const resumeListening = () => {
        setIsSpeaking(false);
        if (handsFreeActiveRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error("Failed to restart recognition after speaking:", e);
          }
        }
      };

      utterance.onend = resumeListening;
      utterance.onerror = resumeListening;

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleNextStep = () => {
    const insts = instructionsRef.current;
    if (!insts || insts.length === 0) return;
    const curr = cookingMode ? cookingStepIndex : activeStepRef.current;
    let nextIdx = 0;
    if (curr !== null) {
      if (curr < insts.length - 1) {
        nextIdx = curr + 1;
      } else {
        speakText("You have completed all steps of this recipe. Bon appétit!");
        return;
      }
    }
    if (cookingMode) {
      setCookingStepIndex(nextIdx);
    } else {
      setActiveStep(nextIdx);
    }
    speakText(`Step ${nextIdx + 1}: ${insts[nextIdx]}`);
  };

  const handlePrevStep = () => {
    const insts = instructionsRef.current;
    if (!insts || insts.length === 0) return;
    const curr = cookingMode ? cookingStepIndex : activeStepRef.current;
    let prevIdx = 0;
    if (curr !== null && curr > 0) {
      prevIdx = curr - 1;
    } else {
      speakText("You are already at the first step.");
      return;
    }
    if (cookingMode) {
      setCookingStepIndex(prevIdx);
    } else {
      setActiveStep(prevIdx);
    }
    speakText(`Step ${prevIdx + 1}: ${insts[prevIdx]}`);
  };

  const handleRepeatStep = () => {
    const insts = instructionsRef.current;
    if (!insts || insts.length === 0) return;
    const curr = cookingMode ? cookingStepIndex : activeStepRef.current;
    if (curr !== null && insts[curr]) {
      speakText(`Repeating Step ${curr + 1}: ${insts[curr]}`);
    } else {
      speakText("No step selected.");
    }
  };

  const handleReadCurrentStep = () => {
    const insts = instructionsRef.current;
    if (!insts || insts.length === 0) return;
    let curr = cookingMode ? cookingStepIndex : activeStepRef.current;
    if (curr === null || curr < 0 || curr >= insts.length) {
      curr = 0;
      if (cookingMode) setCookingStepIndex(0);
      else setActiveStep(0);
    }
    speakText(`Step ${curr + 1}: ${insts[curr]}`);
  };

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let recognition: any = null;

    if (handsFreeActive) {
      if (!SpeechRecognitionAPI) {
        setRecognitionError("Speech Recognition is not supported in this browser.");
        setHandsFreeActive(false);
        return;
      }

      try {
        recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
          setRecognitionError("");
        };

        recognition.onerror = (event: any) => {
          if (event.error === "not-allowed") {
            setRecognitionError("Microphone access is denied.");
            setHandsFreeActive(false);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          if (handsFreeActiveRef.current && window.speechSynthesis && !window.speechSynthesis.speaking) {
            setTimeout(() => {
              if (handsFreeActiveRef.current && window.speechSynthesis && !window.speechSynthesis.speaking) {
                try {
                  recognition?.start();
                } catch (e) {}
              }
            }, 300);
          }
        };

        recognition.onresult = (event: any) => {
          const resultsLength = event.results.length;
          const transcript = event.results[resultsLength - 1][0].transcript.toLowerCase().trim();
          
          if (transcript.includes("next") || transcript.includes("skip")) {
            setLastCommand("next");
            handleNextStep();
          } else if (transcript.includes("back") || transcript.includes("previous") || transcript.includes("prev")) {
            setLastCommand("previous");
            handlePrevStep();
          } else if (transcript.includes("repeat") || transcript.includes("again")) {
            setLastCommand("repeat");
            handleRepeatStep();
          } else if (transcript.includes("stop") || transcript.includes("pause") || transcript.includes("mute")) {
            setLastCommand("stop");
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            setIsSpeaking(false);
          } else if (transcript.includes("play") || transcript.includes("start") || transcript.includes("read")) {
            setLastCommand("play");
            handleReadCurrentStep();
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        setRecognitionError("Could not start speech recognition.");
        setHandsFreeActive(false);
      }
    } else {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }

    return () => {
      if (recognition) {
        recognition.onend = null;
        try {
          recognition.stop();
        } catch (e) {}
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [handsFreeActive]);

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleAiModify = async () => {
    if (!aiInstruction.trim() || !recipe) return;
    setIsModifying(true);
    setAiError("");
    try {
      const res = await fetch("/api/gemini/modify-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe,
          instruction: aiInstruction,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to modify recipe");
      }

      const data = await res.json();
      setModifiedRecipePreview(data);
    } catch (err: any) {
      setAiError(err.message || "An error occurred while modifying the recipe with Gemini.");
    } finally {
      setIsModifying(false);
    }
  };

  const applyAndSaveAiModifications = () => {
    if (!modifiedRecipePreview) return;
    saveModifiedMutation.mutate(modifiedRecipePreview);
  };

  // Helper to scale ingredient quantities safely
  const scaleIngredientText = (ingredient: any, factor: number): string => {
    if (!ingredient) return "";

    if (typeof ingredient === "string") {
      const ingredientStr = ingredient;
      if (factor === 1) return ingredientStr;
      return ingredientStr.replace(/(\d+\/\d+|\d+\.\d+|\d+)/g, (match) => {
        let val = 0;
        if (match.includes("/")) {
          const [num, den] = match.split("/");
          val = parseFloat(num) / parseFloat(den);
        } else {
          val = parseFloat(match);
        }
        if (isNaN(val)) return match;
        const scaled = val * factor;
        if (scaled % 1 === 0) return scaled.toString();
        if (Math.abs(scaled - 0.25) < 0.01) return "1/4";
        if (Math.abs(scaled - 0.33) < 0.02) return "1/3";
        if (Math.abs(scaled - 0.5) < 0.01) return "1/2";
        if (Math.abs(scaled - 0.75) < 0.01) return "3/4";
        if (Math.abs(scaled - 1.5) < 0.01) return "1 1/2";
        if (Math.abs(scaled - 2.5) < 0.01) return "2 1/2";
        return Number(scaled.toFixed(2)).toString();
      });
    }

    if (typeof ingredient === "object" && ingredient !== null) {
      const amountVal = ingredient.amount !== undefined ? ingredient.amount : (ingredient.canonicalAmount || ingredient.minAmount || ingredient.quantity);
      const numAmount = typeof amountVal === "number" ? amountVal : (amountVal ? parseFloat(String(amountVal)) : null);
      const scaledAmount = numAmount !== null && !isNaN(numAmount) && numAmount > 0 ? (numAmount * factor) : null;
      const unit = ingredient.unit ? ` ${ingredient.unit}` : "";

      let modifierStr = "";
      if (Array.isArray(ingredient.modifiers)) {
        modifierStr = ingredient.modifiers.filter(Boolean).map((m: any) => String(m).trim()).join(", ");
      } else if (typeof ingredient.modifiers === "string" && ingredient.modifiers.trim()) {
        modifierStr = ingredient.modifiers.trim();
      } else if (ingredient.modifier) {
        modifierStr = String(ingredient.modifier).trim();
      }
      const modifiers = modifierStr ? ` (${modifierStr})` : "";
      const name = ingredient.name || ingredient.title || ingredient.item || "";

      if (scaledAmount !== null) {
        let displayAmount = scaledAmount % 1 === 0 ? scaledAmount.toString() : Number(scaledAmount.toFixed(2)).toString();
        if (Math.abs(scaledAmount - 0.25) < 0.01) displayAmount = "1/4";
        else if (Math.abs(scaledAmount - 0.33) < 0.02) displayAmount = "1/3";
        else if (Math.abs(scaledAmount - 0.5) < 0.01) displayAmount = "1/2";
        else if (Math.abs(scaledAmount - 0.75) < 0.01) displayAmount = "3/4";
        else if (Math.abs(scaledAmount - 1.5) < 0.01) displayAmount = "1 1/2";
        return `${displayAmount}${unit} ${name}${modifiers}`.trim();
      }
      const fullText = `${unit} ${name}${modifiers}`.trim();
      return fullText || String(name || ingredient.text || "");
    }

    return String(ingredient || "");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EE] dark:bg-zinc-950">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#D95338] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#6E8B6B] dark:text-zinc-400">Loading recipe journal...</p>
        </div>
      </div>
    );
  }

  if (!recipe || !displayRecipe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF6EE] dark:bg-zinc-950 px-4">
        <div className="max-w-md text-center space-y-4">
          <BookOpen className="w-16 h-16 text-stone-300 dark:text-zinc-700 mx-auto" />
          <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">Recipe Not Found</h2>
          <p className="text-stone-500 dark:text-zinc-400 text-sm">The recipe you are looking for does not exist or has been removed.</p>
          <Link to="/">
            <Button className="rounded-full bg-[#D95338] hover:bg-[#c2462e] text-white">Return to Workspace</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Base servings calculation
  const baseServings = typeof displayRecipe.servings === "number" ? displayRecipe.servings : parseInt(displayRecipe.servings) || 2;
  const scaledServings = Math.round(baseServings * multiplier);

  return (
    <div className="min-h-screen bg-[#FAF6EE] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans pb-20 selection:bg-[#D95338]/20">
      
      {/* 4. STEP-BY-STEP COOKING MODE (FULL SCREEN OVERLAY) */}
      <AnimatePresence>
        {cookingMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-50 bg-[#FAF6EE] dark:bg-zinc-950 flex flex-col justify-between p-6 sm:p-12 overflow-y-auto select-none"
          >
            {/* Cooking Mode Top Navigation */}
            <div className="flex items-center justify-between border-b border-[#E6DFC6] dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-2xl bg-[#D95338] text-white shadow-sm">
                  <ChefHat className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-xs uppercase font-bold tracking-widest text-[#6E8B6B] dark:text-emerald-400">
                    Step-by-Step Cooking Mode
                  </h3>
                  <p className="text-sm font-serif font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {displayRecipe.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHandsFreeActive(!handsFreeActive)}
                  className={`rounded-full px-4 py-2 gap-2 text-xs font-bold border min-h-[44px] cursor-pointer shrink-0 ${
                    handsFreeActive 
                      ? "bg-[#6E8B6B] text-white border-[#6E8B6B]" 
                      : "bg-white text-stone-700 border-[#E6DFC6] dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>{handsFreeActive ? "Voice Active" : "Voice Control"}</span>
                </Button>

                {/* View Voice Commands Trigger (min-h-[44px]) */}
                <button
                  type="button"
                  onClick={() => setShowVoiceCommandsHelp((prev) => !prev)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0 ${
                    showVoiceCommandsHelp
                      ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/60"
                      : "bg-white text-stone-700 border-[#E6DFC6] hover:bg-stone-50 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-850"
                  }`}
                  title="Toggle voice commands helper"
                  aria-expanded={showVoiceCommandsHelp}
                >
                  <span>View Voice Commands 💬</span>
                </button>

                <button
                  onClick={() => {
                    setCookingMode(false);
                    setShowVoiceCommandsHelp(false);
                  }}
                  className="min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-stone-200 dark:bg-zinc-800 hover:bg-stone-300 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-200 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                  title="Exit Cooking Mode"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Collapsible Voice Command Helper Layout Tray */}
            <AnimatePresence>
              {showVoiceCommandsHelp && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden w-full max-w-4xl mx-auto my-3 shrink-0"
                >
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-[#E6DFC6] dark:border-zinc-800 shadow-sm backdrop-blur-md space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎙️</span>
                        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                          Hands-Free Voice Commands
                        </h4>
                      </div>
                      <span className="text-[10px] text-stone-500 dark:text-zinc-400 font-medium hidden sm:inline">
                        Speak clearly toward your microphone
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-zinc-850 border border-stone-200/60 dark:border-zinc-800">
                        <span className="font-bold text-zinc-900 dark:text-white">&ldquo;Next&rdquo; / &ldquo;Skip&rdquo;</span>
                        <span className="text-[11px] text-stone-600 dark:text-zinc-400 flex items-center gap-1 font-medium">
                          ➔ Advance step
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-zinc-850 border border-stone-200/60 dark:border-zinc-800">
                        <span className="font-bold text-zinc-900 dark:text-white">&ldquo;Back&rdquo; / &ldquo;Previous&rdquo;</span>
                        <span className="text-[11px] text-stone-600 dark:text-zinc-400 flex items-center gap-1 font-medium">
                          ➔ Previous step
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-zinc-850 border border-stone-200/60 dark:border-zinc-800">
                        <span className="font-bold text-zinc-900 dark:text-white">&ldquo;Repeat&rdquo;</span>
                        <span className="text-[11px] text-stone-600 dark:text-zinc-400 flex items-center gap-1 font-medium">
                          ➔ Read step again
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-zinc-850 border border-stone-200/60 dark:border-zinc-800">
                        <span className="font-bold text-zinc-900 dark:text-white">&ldquo;Stop&rdquo; / &ldquo;Pause&rdquo;</span>
                        <span className="text-[11px] text-stone-600 dark:text-zinc-400 flex items-center gap-1 font-medium">
                          ➔ Mute speech audio
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-zinc-850 border border-stone-200/60 dark:border-zinc-800 sm:col-span-2 md:col-span-1">
                        <span className="font-bold text-zinc-900 dark:text-white">&ldquo;Start&rdquo; / &ldquo;Read&rdquo;</span>
                        <span className="text-[11px] text-stone-600 dark:text-zinc-400 flex items-center gap-1 font-medium">
                          ➔ Speak active step
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Giant Centered Instruction Step */}
            <div className="my-auto py-12 max-w-4xl mx-auto w-full text-center space-y-8">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#6E8B6B] text-white text-sm font-bold tracking-widest uppercase shadow-xs">
                <span>Step {instructions.length > 0 ? cookingStepIndex + 1 : 0} of {instructions.length}</span>
              </div>

              <p className="text-2xl sm:text-4xl md:text-5xl font-serif font-medium text-zinc-900 dark:text-white leading-relaxed sm:leading-snug px-4">
                {instructions[cookingStepIndex] || "No instructions provided."}
              </p>

              {/* Progress Indicator Dots */}
              <div className="flex flex-wrap items-center justify-center pt-4">
                {instructions.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCookingStepIndex(idx);
                      speakText(`Step ${idx + 1}: ${instructions[idx]}`);
                    }}
                    className="w-11 h-11 flex items-center justify-center cursor-pointer transition-all"
                    title={`Go to step ${idx + 1}`}
                    aria-label={`Go to step ${idx + 1}`}
                  >
                    <span
                      className={`h-2.5 rounded-full transition-all pointer-events-none ${
                        cookingStepIndex === idx 
                          ? "w-8 bg-[#D95338]" 
                          : "w-2.5 bg-stone-300 dark:bg-zinc-700 hover:bg-stone-400"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Tactile Terracotta Navigation Controls */}
            <div className="max-w-2xl mx-auto w-full flex items-center justify-between gap-4 pt-4 border-t border-[#E6DFC6] dark:border-zinc-800">
              <button
                onClick={handlePrevStep}
                disabled={cookingStepIndex === 0}
                className={`flex-1 py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                  cookingStepIndex === 0
                    ? "bg-stone-200 text-stone-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed"
                    : "bg-stone-800 hover:bg-stone-900 text-white active:scale-98"
                }`}
              >
                <ChevronLeft className="w-6 h-6" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={() => speakText(`Step ${cookingStepIndex + 1}: ${instructions[cookingStepIndex] || ""}`)}
                className="p-4 rounded-2xl bg-[#6E8B6B] hover:bg-[#5b7558] text-white transition-colors cursor-pointer shadow-md"
                title="Read Step Aloud"
              >
                <Volume2 className="w-6 h-6" />
              </button>

              <button
                onClick={handleNextStep}
                disabled={instructions.length === 0 || cookingStepIndex === instructions.length - 1}
                className={`flex-1 py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#D95338]/20 ${
                  instructions.length === 0 || cookingStepIndex === instructions.length - 1
                    ? "bg-stone-200 text-stone-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed"
                    : "bg-[#D95338] hover:bg-[#c2462e] text-white active:scale-98"
                }`}
              >
                <span>Next Step</span>
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER BAR */}
      <header className="border-b border-[#E6DFC6] dark:border-zinc-800/80 bg-[#FAF6EE]/90 dark:bg-zinc-950/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full border-b border-zinc-200 dark:border-zinc-800 pb-4">
          {/* Navigation & Collection Badge */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-[#E6DFC6] dark:border-zinc-800 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-900 cursor-pointer min-h-[38px]">
                <Home className="w-3.5 h-3.5 text-[#6E8B6B]" />
                <span>Workspace</span>
              </Button>
            </Link>

            {collection && (
              <span
                className="text-[11px] font-semibold px-3 py-1 rounded-full text-white shadow-xs"
                style={{ backgroundColor: collection.color || "#D95338" }}
              >
                {collection.name}
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={() => favoriteMutation.mutate(!recipe.is_favorite)}
              disabled={favoriteMutation.isPending}
              className={`gap-1.5 rounded-full h-9 text-xs border-[#E6DFC6] dark:border-zinc-800 transition-colors cursor-pointer flex-1 sm:flex-none justify-center ${
                recipe.is_favorite 
                  ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400" 
                  : "text-stone-600 dark:text-zinc-300"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${recipe.is_favorite ? "fill-rose-500 text-rose-500" : "text-stone-400"}`} />
              <span>{recipe.is_favorite ? "Saved" : "Favorite"}</span>
            </Button>

            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5 rounded-full border-[#E6DFC6] dark:border-zinc-800 h-9 text-xs cursor-pointer flex-1 sm:flex-none justify-center">
              <Pencil className="w-3.5 h-3.5" /> <span>Edit</span>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5 rounded-full h-9 text-xs flex-1 sm:flex-none justify-center">
                  <Trash2 className="w-3.5 h-3.5" /> <span>Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl bg-[#FAF6EE] dark:bg-zinc-900 border-[#E6DFC6] dark:border-zinc-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif text-xl">Delete Recipe Entry?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to permanently delete "{displayRecipe.title}" from your curated journal?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate(recipe.id)} className="rounded-full bg-[#D95338] hover:bg-[#c2462e]">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        
        {/* PREVIEW MODE BANNER */}
        <AnimatePresence>
          {modifiedRecipePreview && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#D95338] text-white p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 animate-spin shrink-0" />
                <div>
                  <h4 className="font-serif font-medium text-base">Gemini AI Recipe Customization Preview</h4>
                  <p className="text-xs text-orange-100 font-light">Review the culinary adjustments below. Save to commit changes.</p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModifiedRecipePreview(null)}
                  className="rounded-full border-white/40 text-white bg-transparent hover:bg-white/15 w-full sm:w-auto text-xs"
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={applyAndSaveAiModifications}
                  disabled={saveModifiedMutation.isPending}
                  className="rounded-full bg-white text-[#D95338] hover:bg-stone-100 w-full sm:w-auto text-xs font-bold"
                >
                  {saveModifiedMutation.isPending ? "Saving..." : "Save Recipe"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. EDITORIAL HERO SECTION */}
        <div className="bg-white/80 dark:bg-zinc-900/80 rounded-3xl border border-[#E6DFC6] dark:border-zinc-800 overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12 gap-0">
          {displayRecipe.image_url && (
            <div className="md:col-span-5 h-64 md:h-full min-h-[280px] relative">
              <img
                src={displayRecipe.image_url}
                alt={displayRecipe.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent md:hidden" />
            </div>
          )}

          <div className={`${displayRecipe.image_url ? "md:col-span-7" : "md:col-span-12"} p-6 sm:p-10 space-y-6 flex flex-col justify-center`}>
            
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium tracking-tight text-zinc-900 dark:text-white leading-tight">
                {displayRecipe.title}
              </h1>
              {displayRecipe.description && (
                <p className="text-stone-600 dark:text-zinc-300 text-sm sm:text-base leading-relaxed font-light">
                  {displayRecipe.description}
                </p>
              )}
            </div>

            {/* 2. METADATA METERS (Horizontal Badge Container with Sage Green #6E8B6B) */}
            <div className="pt-4 border-t border-[#E6DFC6]/60 dark:border-zinc-800">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6E8B6B] text-white text-xs font-semibold shadow-xs">
                  <Clock className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Prep: {displayRecipe.prep_time || "15 mins"}</span>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6E8B6B] text-white text-xs font-semibold shadow-xs">
                  <Flame className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Cook: {displayRecipe.cook_time || "20 mins"}</span>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6E8B6B] text-white text-xs font-semibold shadow-xs">
                  <Users className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Yield: {scaledServings} servings</span>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-800 text-white text-xs font-semibold shadow-xs">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>Total: {formatTotalTime(displayRecipe.prep_time, displayRecipe.cook_time)}</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {displayRecipe.tags && displayRecipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {displayRecipe.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#FAF6EE] dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 border border-[#E6DFC6] dark:border-zinc-700"
                  >
                    <Tag className="w-3 h-3 text-[#D95338]" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. INGREDIENTS & INSTRUCTIONS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* INGREDIENTS CARD PANEL WITH MULTIPLIERS */}
          <div className="md:col-span-5 bg-white/80 dark:bg-zinc-900/80 rounded-3xl border border-[#E6DFC6] dark:border-zinc-800 p-6 sm:p-7 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6DFC6]/60 dark:border-zinc-800 pb-4">
              <h2 className="text-xl font-serif font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Utensils className="w-5 h-5 text-[#D95338]" />
                <span>Ingredients</span>
              </h2>

              {/* Quantity Multipliers (1x, 2x, 4x) */}
              <div className="flex items-center gap-1 bg-[#FAF6EE] dark:bg-zinc-800 p-1 rounded-full border border-[#E6DFC6] dark:border-zinc-700">
                {[1, 1.5, 2, 4].map((factor) => (
                  <button
                    key={factor}
                    onClick={() => setMultiplier(factor)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      multiplier === factor
                        ? "bg-[#D95338] text-white shadow-xs"
                        : "text-stone-600 dark:text-zinc-400 hover:text-stone-900"
                    }`}
                  >
                    {factor}x
                  </button>
                ))}
              </div>
            </div>

            {rawIngredients.length === 0 ? (
              <p className="text-sm text-stone-400 italic">No ingredients listed for this recipe.</p>
            ) : (
              <div className="space-y-2.5">
                {rawIngredients.map((ing, idx) => {
                  const isChecked = !!checkedIngredients[idx];
                  const scaledText = scaleIngredientText(ing, multiplier);
                  const pantryMatch = checkIngredientPantryMatch(ing, pantryItems);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleIngredient(idx)}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-2xl cursor-pointer hover:bg-[#FAF6EE] dark:hover:bg-zinc-800/50 transition-colors select-none ${
                        isChecked ? "opacity-45" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="mt-0.5 text-[#D95338] flex-shrink-0">
                          {isChecked ? <CheckSquare className="w-5 h-5 text-[#6E8B6B]" /> : <Square className="w-5 h-5 text-stone-300 dark:text-zinc-700" />}
                        </span>
                        <div className="min-w-0">
                          <span className={`text-sm text-zinc-800 dark:text-zinc-200 font-sans block ${isChecked ? "line-through" : ""}`}>
                            {scaledText}
                          </span>
                          {pantryMatch.isEggPart && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold inline-flex items-center gap-1 mt-0.5">
                              🥚 1:1 mapped to pantry Eggs ({pantryMatch.availableQuantity} available)
                            </span>
                          )}
                        </div>
                      </div>

                      {pantryMatch.isSatisfied ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#6E8B6B]/15 text-[#6E8B6B] border border-[#6E8B6B]/30 shrink-0 shadow-2xs">
                          <Check className="w-3 h-3 stroke-[2.5]" /> In Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D95338]/15 text-[#D95338] border border-[#D95338]/30 shrink-0 shadow-2xs">
                          Out of Stock
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* INSTRUCTIONS & COOKING MODE LAUNCHER */}
          <div className="md:col-span-7 bg-white/80 dark:bg-zinc-900/80 rounded-3xl border border-[#E6DFC6] dark:border-zinc-800 p-6 sm:p-7 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E6DFC6]/60 dark:border-zinc-800 pb-4">
              <h2 className="text-xl font-serif font-semibold text-zinc-900 dark:text-white">
                Step-by-Step Instructions
              </h2>

              <Button
                type="button"
                onClick={() => {
                  setCookingStepIndex(0);
                  setCookingMode(true);
                }}
                className="rounded-full bg-[#D95338] hover:bg-[#c2462e] text-white px-4 py-2 text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <ChefHat className="w-4 h-4" />
                <span>Start Cooking Mode</span>
              </Button>
            </div>

            {instructions.length === 0 ? (
              <p className="text-sm text-stone-400 italic">No step-by-step instructions provided.</p>
            ) : (
              <div className="space-y-4">
                {instructions.map((inst, idx) => {
                  const isCurrent = activeStep === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        const nextStep = isCurrent ? null : idx;
                        setActiveStep(nextStep);
                        if (nextStep !== null) {
                          speakText(`Step ${nextStep + 1}: ${inst}`);
                        } else {
                          window.speechSynthesis.cancel();
                          setIsSpeaking(false);
                        }
                      }}
                      className={`flex items-start gap-4 p-4 rounded-2xl transition-all border cursor-pointer select-none ${
                        isCurrent
                          ? "bg-[#FAF6EE] dark:bg-zinc-800/80 border-[#6E8B6B] shadow-xs"
                          : "border-transparent hover:bg-[#FAF6EE]/60 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isCurrent ? "bg-[#6E8B6B] text-white" : "bg-[#E6DFC6]/50 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300"
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-grow space-y-1 py-0.5 min-w-0">
                        <p className={`text-sm sm:text-base leading-relaxed ${isCurrent ? "text-zinc-900 dark:text-white font-medium" : "text-stone-700 dark:text-zinc-300 font-light"}`}>
                          {inst}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSpeaking && activeStep === idx) {
                            window.speechSynthesis.cancel();
                            setIsSpeaking(false);
                          } else {
                            setActiveStep(idx);
                            speakText(`Step ${idx + 1}: ${inst}`);
                          }
                        }}
                        className="p-2 rounded-full text-stone-400 hover:text-[#D95338] transition-colors shrink-0 cursor-pointer"
                        title="Read step aloud"
                      >
                        {isSpeaking && activeStep === idx ? (
                          <VolumeX className="w-5 h-5 text-[#D95338] animate-pulse" />
                        ) : (
                          <Volume2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* GEMINI AI CUSTOMIZATION MODULE */}
        <div className="bg-stone-900 text-stone-100 p-6 sm:p-8 rounded-3xl space-y-4 shadow-xl border border-stone-800 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-[#D95338]/20 blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#D95338]/20 text-[#D95338]">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-medium text-white">Modify with Chef Gemini</h3>
              <p className="text-xs text-stone-400 font-light">Ask AI to adapt ingredients, adjust portion sizes, or customize for dietary preferences.</p>
            </div>
          </div>

          <div className="space-y-3">
            <textarea
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              placeholder="e.g., 'Make it vegan', 'Double the garlic', 'Adapt for keto', 'Make it gluten-free'"
              rows={2}
              className="w-full text-sm rounded-2xl border border-stone-800 bg-stone-950/80 p-3.5 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#D95338] text-stone-100 border-transparent"
              disabled={isModifying}
            />

            {aiError && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleAiModify}
                disabled={isModifying || !aiInstruction.trim()}
                className="w-full gap-2 rounded-full text-xs h-11 bg-[#D95338] hover:bg-[#c2462e] text-white font-bold cursor-pointer shadow-md"
              >
                {isModifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Chef Gemini is working...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Transform Recipe</span>
                  </>
                )}
              </Button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs text-stone-400 font-medium">Quick Suggestions:</span>
              {["Make it Vegan", "Scale to 6 servings", "Make it Gluten-Free", "Double portions"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAiInstruction(preset)}
                  className="text-xs bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 px-3 py-1 rounded-full cursor-pointer transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* Edit Recipe Modal */}
      <RecipeFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        recipe={recipe}
        collections={collections}
      />
    </div>
  );
}
