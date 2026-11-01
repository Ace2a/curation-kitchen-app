/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Plus, Minus, Check, Sparkles, Tag, ShoppingBag, 
  AlertTriangle, EyeOff, ShieldCheck, Scale, Package,
  Crown, Lock, ArrowRight
} from "lucide-react";
import { Button } from "../ui/button";
import { PantryItem } from "../../types";
import { isPantryItemVisible } from "../../services/pantryService";
import { recipeClient } from "../../api/recipeClient";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getProductEmoji, calculateEstimatedShelfLifeDays } from "../../lib/pantryUtils";

export const LIMIT_FREE_PANTRY_ITEMS = 20;

export interface ResolvedPantryItem {
  item_name?: string;
  name?: string;
  raw_name?: string;
  category?: string;
  quantity?: number | string;
  unit?: string;
  price?: number;
  brand?: string | null;
  upc_code?: string | null;
  upc?: string | null;
  plu_code?: string | null;
  is_organic?: boolean;
  image_url?: string;
  source?: string;
  confidence?: number;
  is_fallback?: boolean;
}

export const PANTRY_CATEGORIES = [
  "Produce",
  "Pantry Staples",
  "Dairy & Eggs",
  "Proteins",
  "Spices & Oils",
  "Grains & Baking",
  "Bakery",
  "Beverages",
  "Frozen",
  "Snacks",
  "Other"
] as const;

export interface QuantityConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  resolvedItem: ResolvedPantryItem | null;
  onSuccess?: (savedItem: PantryItem) => void;
}

/**
 * Standard produce units per IFPS PLU conventions.
 */
export const PRODUCE_UNITS = ["pcs", "lbs", "bunch", "oz"] as const;

/**
 * Standard packaged goods units per UPC retail packaging conventions.
 */
export const PACKAGED_UNITS = ["units", "cans", "boxes", "packs"] as const;

/**
 * Common produce items sold by weight that default to "lbs".
 */
const WEIGHT_BASED_PRODUCE = [
  "banana", "bananas", "apple", "apples", "potato", "potatoes",
  "onion", "onions", "tomato", "tomatoes", "grape", "grapes",
  "carrot", "carrots", "sweet potato", "orange", "oranges",
  "pear", "pears", "peach", "peaches", "cherry", "cherries",
  "mushroom", "mushrooms", "green bean", "green beans", "ginger"
];

/**
 * Common produce items sold in bunches.
 */
const BUNCHED_PRODUCE = [
  "green onion", "green onions", "scallion", "scallions",
  "cilantro", "parsley", "kale", "celery", "spinach", "mint", "basil", "asparagus"
];

/**
 * Resolves the unit options and intelligent default unit for a resolved item.
 * 
 * RULE 2 (DYNAMIC UNIT PICKER):
 * - If the item has a 'plu_code' (produce), populate with ["pcs", "lbs", "bunch", "oz"].
 *   Default to "pcs" or "lbs" based on standard logic (e.g. Bananas default to "lbs").
 * - If the item has a 'upc_code' (packaged goods), populate with ["units", "cans", "boxes", "packs"].
 *   Default to "units".
 */
export function determineUnitConfiguration(item: ResolvedPantryItem | null): {
  unitOptions: string[];
  defaultUnit: string;
  isProduce: boolean;
} {
  if (!item) {
    return { unitOptions: [...PACKAGED_UNITS], defaultUnit: "units", isProduce: false };
  }

  const cleanName = (item.item_name || item.name || "").toLowerCase();
  const rawPlu = item.plu_code || (item.upc?.startsWith("PLU-") ? item.upc.replace("PLU-", "") : null);
  const rawUpc = item.upc_code || (item.upc && !item.upc.startsWith("PLU-") ? item.upc : null);

  const hasPlu = Boolean(rawPlu);
  const hasUpc = Boolean(rawUpc);

  // If item has a PLU code or is categorized under Produce without a UPC barcode
  if (hasPlu || (!hasUpc && item.category?.toLowerCase() === "produce")) {
    let defaultUnit = "pcs";

    // Standard culinary logic: Check bunched items first (e.g. Green Onions), then weighted items (e.g. Bananas, standard Onions)
    if (BUNCHED_PRODUCE.some((b) => cleanName.includes(b))) {
      defaultUnit = "bunch";
    } else if (WEIGHT_BASED_PRODUCE.some((p) => cleanName.includes(p))) {
      defaultUnit = "lbs";
    }

    return {
      unitOptions: [...PRODUCE_UNITS],
      defaultUnit,
      isProduce: true,
    };
  }

  // Packaged goods with a UPC barcode (or general packaged items)
  let defaultPackagedUnit = "units";
  if (cleanName.includes("soup") || cleanName.includes("canned") || cleanName.includes("beans in can")) {
    defaultPackagedUnit = "cans";
  } else if (cleanName.includes("cereal") || cleanName.includes("pasta") || cleanName.includes("cracker")) {
    defaultPackagedUnit = "boxes";
  }

  return {
    unitOptions: [...PACKAGED_UNITS],
    defaultUnit: defaultPackagedUnit,
    isProduce: false,
  };
}

/**
 * Dynamic status calculator based on stock quantity.
 */
export function calculatePantryStockStatus(quantity: number): "In Stock" | "Running Low" | "Out of Stock" {
  if (quantity <= 0) return "Out of Stock";
  if (quantity <= 1) return "Running Low";
  return "In Stock";
}

export function QuantityConfirmationModal({
  isOpen,
  onClose,
  resolvedItem,
  onSuccess,
}: QuantityConfirmationModalProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Premium Subscription & Tier Gatekeeper evaluation
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("kitchen_is_premium") === "true";
  });

  // Query pantry items to calculate active items against free tier limit (LIMIT_FREE_PANTRY_ITEMS = 20)
  const { data: pantryItems = [] } = useQuery<PantryItem[]>({
    queryKey: ["pantry"],
    queryFn: () => recipeClient.pantry.list(),
  });

  const pantryItemsCount = pantryItems.length;
  const isFreeTierCapReached = !isPremium && pantryItemsCount >= LIMIT_FREE_PANTRY_ITEMS;

  // Determine if item is an unindexed fallback barcode
  const isFallbackItem = Boolean(
    resolvedItem?.is_fallback ||
    resolvedItem?.source === "manual_fallback" ||
    (resolvedItem?.item_name && resolvedItem.item_name.includes("Unidentified Barcode"))
  );

  // Derive initial values from resolved item
  const resolvedName = useMemo(() => {
    return resolvedItem?.item_name || resolvedItem?.name || "Kitchen Ingredient";
  }, [resolvedItem]);

  const unitConfig = useMemo(() => {
    return determineUnitConfiguration(resolvedItem);
  }, [resolvedItem]);

  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>("units");
  const [customName, setCustomName] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("Pantry Staples");
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const nameInputRef = React.useRef<HTMLInputElement | null>(null);

  // Reset local state whenever a new resolved item is opened
  useEffect(() => {
    if (isOpen && resolvedItem) {
      const initialQty = typeof resolvedItem.quantity === "number" 
        ? resolvedItem.quantity 
        : typeof resolvedItem.quantity === "string"
        ? parseFloat(resolvedItem.quantity) || 1
        : 1;

      setQuantity(Math.max(0, initialQty));
      setUnit(resolvedItem.unit && unitConfig.unitOptions.includes(resolvedItem.unit) 
        ? resolvedItem.unit 
        : unitConfig.defaultUnit);
      setSaveFeedback(null);
      setNameError(null);

      const isFallback = Boolean(
        resolvedItem.is_fallback ||
        resolvedItem.source === "manual_fallback" ||
        (resolvedItem.item_name && resolvedItem.item_name.includes("Unidentified Barcode"))
      );

      const initialCustomName = isFallback && resolvedItem.item_name?.includes("Unidentified Barcode")
        ? ""
        : (resolvedItem.item_name || resolvedItem.name || "");

      setCustomName(initialCustomName);
      setCustomCategory(resolvedItem.category || (unitConfig.isProduce ? "Produce" : "Pantry Staples"));
      setIsEditingName(isFallback);

      if (isFallback) {
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 150);
      }
    }
  }, [isOpen, resolvedItem, unitConfig]);

  if (!isOpen || !resolvedItem) return null;

  const currentStatus = calculatePantryStockStatus(quantity);
  const isHiddenByCoreRule = !isPantryItemVisible({ quantity, status: currentStatus });

  // Effective display name & category
  const activeName = customName.trim() || (isFallbackItem ? "New Food Item" : resolvedName);
  const activeCategory = customCategory || resolvedItem.category || (unitConfig.isProduce ? "Produce" : "Pantry Staples");

  // Stepper Handlers
  const handleDecrement = () => {
    setQuantity((prev) => Math.max(0, prev - 1));
  };

  const handleIncrement = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleDirectQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setQuantity(0);
    } else {
      setQuantity(Math.max(0, val));
    }
  };

  // Commit to Pantry
  const handleCommitToPantry = async () => {
    if (isSubmitting) return;

    // Validation for unindexed fallback item
    if (isFallbackItem && !customName.trim()) {
      setNameError("Please enter a name for this item before saving.");
      nameInputRef.current?.focus();
      return;
    }

    // PremiumGatekeeper evaluation: block Free tier if limit reached
    if (isFreeTierCapReached) {
      setSaveFeedback(`⚠️ Free tier storage limit reached (${pantryItemsCount}/${LIMIT_FREE_PANTRY_ITEMS} items). Please upgrade to Premium to continue adding ingredients.`);
      return;
    }

    setIsSubmitting(true);
    setNameError(null);

    try {
      const nowIso = new Date().toISOString();
      const rawPlu = resolvedItem.plu_code || (resolvedItem.upc?.startsWith("PLU-") ? resolvedItem.upc.replace("PLU-", "") : null);
      const rawUpc = resolvedItem.upc_code || (resolvedItem.upc && !resolvedItem.upc.startsWith("PLU-") ? resolvedItem.upc : null);

      const shelfDays = calculateEstimatedShelfLifeDays(activeName, activeCategory);
      const useByDate = new Date(Date.now() + shelfDays * 86400000).toISOString();

      // Build complete PantryItem record payload
      const pantryRecordPayload: Partial<PantryItem> = {
        name: activeName,
        item_name: activeName,
        category: activeCategory,
        quantity: quantity,
        unit: unit,
        status: currentStatus,
        upc_code: rawUpc,
        plu_code: rawPlu,
        is_organic: Boolean(resolvedItem.is_organic),
        brand: resolvedItem.brand || null,
        date_added: nowIso,
        created_date: nowIso,
        purchase_date: nowIso,
        use_by_date: useByDate,
        shelf_life_days: shelfDays,
      };

      const savedItem = await recipeClient.pantry.create(pantryRecordPayload);

      // Invalidate queries so UI reflects update immediately
      await queryClient.invalidateQueries({ queryKey: ["pantry"] });

      if (onSuccess) {
        onSuccess(savedItem);
      }

      setSaveFeedback(
        quantity === 0
          ? `Saved "${activeName}" (0 ${unit}) — Marked Out of Stock & hidden from active shelves per core rules.`
          : `🎉 "${activeName}" (${quantity} ${unit}) added to pantry!`
      );

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 900);
    } catch (err: any) {
      console.error("Failed to commit resolved item to pantry", err);
      setIsSubmitting(false);
      setSaveFeedback(`Failed to save: ${err.message || "Unknown error"}`);
    }
  };

  const categoryEmoji = getProductEmoji(
    activeCategory,
    activeName
  );

  return (
    <AnimatePresence>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="quantity-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md bg-[#FAF6EE] dark:bg-zinc-900 border border-[#E6DFC6] dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100 flex flex-col"
        >
          {/* Top Decorative Header Strip */}
          <div className="bg-gradient-to-r from-[#D95338] via-[#e5684e] to-amber-500 h-2 w-full" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close quantity confirmation"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-7 space-y-6">
            {/* 1. RESOLVED PRODUCT HEADER */}
            <div className="space-y-2">
              {/* Badges Row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {isFallbackItem ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono">
                    <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Unindexed Barcode
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#6E8B6B]/15 text-[#6E8B6B] border border-[#6E8B6B]/30 font-mono">
                    <Sparkles className="w-3 h-3" /> Resolved Product
                  </span>
                )}

                {resolvedItem.is_organic && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-mono">
                    🌿 Certified Organic
                  </span>
                )}

                {resolvedItem.plu_code && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    <Scale className="w-3 h-3" /> PLU {resolvedItem.plu_code}
                  </span>
                )}

                {(resolvedItem.upc_code || (resolvedItem.upc && !resolvedItem.upc.startsWith("PLU-"))) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-stone-200 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 border border-stone-300 dark:border-zinc-700">
                    <Package className="w-3 h-3" /> UPC {resolvedItem.upc_code || resolvedItem.upc}
                  </span>
                )}
              </div>

              {/* Resolved Item Name Header or Editable Form */}
              {isFallbackItem || isEditingName ? (
                <div className="space-y-3 pt-1">
                  {isFallbackItem && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs">
                      <p className="font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Barcode not yet indexed</span>
                      </p>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                        Name your product and select a category to save it in two taps.
                      </p>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label 
                        htmlFor="custom-item-name"
                        className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-zinc-400"
                      >
                        Product Name <span className="text-[#D95338]">*</span>
                      </label>
                      {!isFallbackItem && (
                        <button
                          type="button"
                          onClick={() => setIsEditingName(false)}
                          className="text-[11px] font-bold text-stone-500 hover:text-stone-800 dark:hover:text-zinc-200 underline cursor-pointer"
                        >
                          Done
                        </button>
                      )}
                    </div>
                    <input
                      id="custom-item-name"
                      ref={nameInputRef}
                      type="text"
                      value={customName}
                      onChange={(e) => {
                        setCustomName(e.target.value);
                        setNameError(null);
                      }}
                      placeholder="e.g., Almond Butter, Organic Salsa..."
                      className="w-full px-3.5 py-2.5 min-h-[46px] rounded-xl bg-white dark:bg-zinc-800 border border-[#E6DFC6] dark:border-zinc-700 text-zinc-900 dark:text-white font-medium text-sm focus:outline-hidden focus:ring-2 focus:ring-[#6E8B6B] shadow-inner"
                    />
                    {nameError && (
                      <p className="text-[11px] text-[#D95338] font-bold mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{nameError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label 
                      htmlFor="custom-item-category"
                      className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-zinc-400 mb-1"
                    >
                      Category
                    </label>
                    <select
                      id="custom-item-category"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-zinc-800 border border-[#E6DFC6] dark:border-zinc-700 text-zinc-900 dark:text-white font-medium text-xs focus:outline-hidden focus:ring-2 focus:ring-[#6E8B6B] cursor-pointer"
                    >
                      {PANTRY_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-[11px] text-[#6E8B6B] dark:text-[#8cb088] font-medium flex items-center gap-1 pt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Est. Shelf-Life: ~{calculateEstimatedShelfLifeDays(activeName, activeCategory)} days</span>
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-3 pt-1">
                  <span className="text-3xl p-2.5 rounded-2xl bg-white dark:bg-zinc-800 border border-[#E6DFC6] dark:border-zinc-700 shadow-xs shrink-0 select-none">
                    {categoryEmoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 
                        id="quantity-modal-title" 
                        className="text-xl sm:text-2xl font-serif font-bold text-zinc-900 dark:text-white leading-tight break-words"
                      >
                        {activeName}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(true)}
                        className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-200/50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                        aria-label="Edit product name"
                      >
                        <Tag className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                      Category: <span className="font-semibold text-stone-700 dark:text-zinc-300">{activeCategory}</span>
                      {resolvedItem.brand ? ` • Brand: ${resolvedItem.brand}` : ""}
                    </p>
                    <p className="text-[11px] text-[#6E8B6B] dark:text-[#8cb088] font-medium flex items-center gap-1 mt-1">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Est. Shelf-Life: ~{calculateEstimatedShelfLifeDays(activeName, activeCategory)} days • Date-tracking enabled</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. QUANTITY STEPPER COMPONENT */}
            <div className="bg-white/80 dark:bg-zinc-850/80 rounded-2xl p-4 sm:p-5 border border-[#E6DFC6] dark:border-zinc-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                  Quantity Stepper
                </label>
                
                {/* Dynamic Status Indicator */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  currentStatus === "In Stock"
                    ? "bg-[#6E8B6B]/15 text-[#6E8B6B] border border-[#6E8B6B]/30"
                    : currentStatus === "Running Low"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                    : "bg-[#D95338]/15 text-[#D95338] border border-[#D95338]/30"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    currentStatus === "In Stock" ? "bg-[#6E8B6B]" : currentStatus === "Running Low" ? "bg-amber-500" : "bg-[#D95338]"
                  }`} />
                  {currentStatus}
                </span>
              </div>

              {/* Stepper controls */}
              <div className="flex items-center justify-between gap-3 pt-1">
                {/* Minus Button */}
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= 0 || isSubmitting}
                  className="w-14 h-14 rounded-2xl bg-[#FAF6EE] dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed border border-[#E6DFC6] dark:border-zinc-700 flex items-center justify-center text-stone-700 dark:text-zinc-200 transition-all shadow-xs cursor-pointer select-none"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-6 h-6 stroke-[2.5]" />
                </button>

                {/* Prominent Current Number Display */}
                <div className="flex-1 flex flex-col items-center justify-center py-1">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={quantity}
                    onChange={handleDirectQtyChange}
                    disabled={isSubmitting}
                    className="w-full text-center text-4xl sm:text-5xl font-black font-mono text-zinc-900 dark:text-white bg-transparent border-none focus:outline-hidden focus:ring-0 p-0 selection:bg-[#D95338]/20"
                    aria-label="Quantity amount"
                  />
                  <span className="text-xs font-semibold text-stone-500 dark:text-zinc-400 mt-1 uppercase tracking-wider font-mono">
                    {unit}
                  </span>
                </div>

                {/* Plus Button */}
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={isSubmitting}
                  className="w-14 h-14 rounded-2xl bg-[#FAF6EE] dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 active:scale-95 border border-[#E6DFC6] dark:border-zinc-700 flex items-center justify-center text-stone-700 dark:text-zinc-200 transition-all shadow-xs cursor-pointer select-none"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-2 border-t border-[#E6DFC6]/50 dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mr-1">Quick:</span>
                {[0, 1, 2, 3, 5, 12].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantity(preset)}
                    className={`min-h-[36px] min-w-[36px] px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                      quantity === preset
                        ? "bg-[#D95338] text-white shadow-xs"
                        : "bg-[#FAF6EE] dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-700 border border-[#E6DFC6]/60 dark:border-zinc-700"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. DYNAMIC UNIT PICKER */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="unit-picker-select"
                  className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-zinc-400 flex items-center gap-1.5"
                >
                  <span>Measurement Unit</span>
                  <span className="text-[10px] text-stone-400 font-normal">
                    ({unitConfig.isProduce ? "Produce options" : "Packaged options"})
                  </span>
                </label>

                <span className="text-[10px] font-mono font-semibold text-stone-400">
                  {unitConfig.isProduce ? "PLU Standard" : "UPC Standard"}
                </span>
              </div>

              {/* Segmented Unit Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {unitConfig.unitOptions.map((opt) => {
                  const isSelected = unit === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setUnit(opt)}
                      disabled={isSubmitting}
                      className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer border flex items-center justify-center ${
                        isSelected
                          ? "bg-[#6E8B6B] text-white border-[#6E8B6B] shadow-sm scale-102"
                          : "bg-white/80 dark:bg-zinc-850 text-stone-700 dark:text-zinc-300 border-[#E6DFC6] dark:border-zinc-750 hover:bg-stone-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. ZERO UNITS / OUT OF STOCK CORE RULE NOTICE */}
            {isHiddenByCoreRule && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2.5"
              >
                <EyeOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-extrabold text-[11px] uppercase tracking-wide">
                    Core App Rule: 0-Unit Item Will Be Hidden
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                    Items with 0 units or &ldquo;Out of Stock&rdquo; status are filtered out of active pantry shelf views by <code className="font-mono font-bold">isPantryItemVisible</code> to keep kitchen shelves uncluttered.
                  </p>
                </div>
              </motion.div>
            )}

            {/* 4.5. PREMIUM OVERAGE PROTECTION GATING CARD & UPGRADE TRIGGER */}
            {isFreeTierCapReached && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/40 text-amber-950 dark:text-amber-200 text-xs space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 shadow-sm">
                    <Crown className="w-5 h-5 fill-white" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-300">
                        Free Tier Storage Limit Reached
                      </h4>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 shrink-0">
                        {pantryItemsCount} / {LIMIT_FREE_PANTRY_ITEMS} Used
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
                      You have reached the Free Tier limit of <strong>{LIMIT_FREE_PANTRY_ITEMS} ingredients</strong>. Upgrade to <strong>Premium</strong> to unlock unlimited ingredient tracking, multi-week meal planning, and advanced AI synchronization.
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem("kitchen_is_premium", "true");
                      setIsPremium(true);
                      setSaveFeedback("🎉 Premium unlocked! You now have unlimited pantry storage.");
                    }}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/25 cursor-pointer transition-all"
                  >
                    <Crown className="w-3.5 h-3.5 fill-white" />
                    <span>Upgrade to Premium (Unlock Unlimited)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Notification / Feedback Banner */}
            {saveFeedback && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saveFeedback}</span>
              </div>
            )}

            {/* 5. ACTION BUTTONS */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-2xl text-xs font-bold text-stone-500 hover:text-stone-800 dark:hover:text-zinc-200 px-4 min-h-[44px] cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleCommitToPantry}
                disabled={isSubmitting || isFreeTierCapReached}
                className={`flex-1 rounded-2xl text-white text-xs font-extrabold min-h-[44px] py-2.5 px-5 transition-all flex items-center justify-center gap-2 ${
                  isFreeTierCapReached
                    ? "bg-stone-300 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-300 dark:border-stone-700 cursor-not-allowed opacity-75 shadow-none"
                    : "bg-[#D95338] hover:bg-[#c2462e] active:scale-98 shadow-lg shadow-[#D95338]/25 cursor-pointer"
                }`}
              >
                {isFreeTierCapReached ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Free Cap Reached ({pantryItemsCount}/{LIMIT_FREE_PANTRY_ITEMS})</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isSubmitting ? "Committing..." : "Add to Pantry"}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
