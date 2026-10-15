/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeClient } from "../../api/recipeClient";
import { PantryItem, Recipe } from "../../types";
import { 
  Search, Plus, Trash2, Tag, Check, Sparkles, ChefHat, 
  Home, RefreshCw, AlertCircle, ShoppingBag, Filter, ArrowRight, X, Clock, PlusCircle,
  Barcode, Camera, ShoppingCart, Zap, CheckCircle2, AlertTriangle, Calendar,
  BarChart2, ChevronDown, Activity
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PantryModal } from "./PantryModal";
import { PantryInventoryHealth } from "./PantryInventoryHealth";
import { QuantityConfirmationModal, ResolvedPantryItem } from "./QuantityConfirmationModal";
import { UnifiedSearchOverlay } from "./UnifiedSearchOverlay";
import { unifiedPantrySearch, isPantryItemVisible } from "../../services/pantryService";
import { 
  cleanIngredientTitle, 
  canonicalizeIngredientName,
  consolidatePantryItems, 
  getProductEmoji, 
  ConsolidatedPantryItem,
  computeSmartRecipeSuggestions,
  SmartRecipeSuggestion
} from "../../lib/pantryUtils";

interface PantryHubProps {
  isOpen?: boolean;
  onClose?: () => void;
  isPage?: boolean;
}

const CATEGORIES = [
  "All",
  "Produce",
  "Dairy & Eggs",
  "Proteins",
  "Pantry Staples",
  "Grains & Baking",
  "Spices & Oils",
  "Other"
];

// Check for shelf-life warning, use-by date expiration, or running-low condition
const isExpiringSoon = (item: ConsolidatedPantryItem): boolean => {
  if (item.freshness?.isNearingUseBy || item.freshness?.isExpired) return true;
  if ((item.rawItem as any)?.is_nearing_use_by || (item.rawItem as any)?.freshness_warning) return true;
  const nameLower = item.name.toLowerCase();
  return (
    nameLower.includes("milk") || 
    nameLower.includes("heavy cream") ||
    nameLower.includes("cream") ||
    nameLower.includes("yogurt") || 
    nameLower.includes("spinach") || 
    nameLower.includes("chicken") || 
    nameLower.includes("salad") || 
    nameLower.includes("fish") ||
    nameLower.includes("berry") ||
    item.status === "Running Low" ||
    item.quantityNumber === 1
  );
};

// 1. UI VISIBILITY GATE: Hide user-facing affiliate features until corporate partnerships are approved
export const IS_AFFILIATE_ENABLED = false;

export const triggerAffiliateFulfillment = (storeName: string, ingredientName: string) => {
  if (!IS_AFFILIATE_ENABLED) {
    console.log(`[Affiliate Grocery Fulfillment] Disabled by feature flag (IS_AFFILIATE_ENABLED=false) -> Store: "${storeName}", Ingredient: "${ingredientName}"`);
    return;
  }
  console.log(`[Affiliate Grocery Fulfillment] triggerAffiliateFulfillment -> Store: "${storeName}", Ingredient: "${ingredientName}"`);
  const safeEncoded = encodeURIComponent(ingredientName.trim());
  let targetUrl = `https://instacart.ca/store/s?k=${safeEncoded}&affiliate_id=YOUR_PARTNER_ID_PLACEHOLDER`;
  if (storeName.toLowerCase().includes("walmart")) {
    targetUrl = `https://walmart.ca/en/search?q=${safeEncoded}&utm_source=affiliate&utm_medium=YOUR_RAKUTEN_ID_PLACEHOLDER`;
  } else if (
    storeName.toLowerCase().includes("voilà") ||
    storeName.toLowerCase().includes("voila") ||
    storeName.toLowerCase().includes("sobeys")
  ) {
    targetUrl = `https://voila.ca/products/search?q=${safeEncoded}&subid=YOUR_IMPACT_ID_PLACEHOLDER`;
  }
  try {
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  } catch (err) {
    console.warn("Unable to open affiliate link in new tab", err);
  }
};

export const openAffiliateGroceryLink = (ingredientName: string) => {
  triggerAffiliateFulfillment("Instacart Canada", ingredientName);
};

export function PantryHub({ isPage = true, onClose }: PantryHubProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "In Stock" | "Expiring Soon" | "Running Low" | "Out of Stock">("All");

  // Add Item Modal / Inline Form
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState(CATEGORIES[1]);
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemPurchaseDate, setNewItemPurchaseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newItemUseByDate, setNewItemUseByDate] = useState("");

  // Pantry recipe match modal
  const [isCookModalOpen, setIsCookModalOpen] = useState(false);

  // UPC & Grocery Modal State
  const [isPantryModalOpen, setIsPantryModalOpen] = useState(false);
  const [pantryModalTab, setPantryModalTab] = useState<"pantry" | "grocery" | "upc">("upc");

  // Canadian Grocery Fulfillment Bottom Sheet State
  const [deliveryTargetIngredient, setDeliveryTargetIngredient] = useState<string | null>(null);

  // Unified Scanner & Search Overlay State
  const [isUnifiedScannerOpen, setIsUnifiedScannerOpen] = useState(false);

  // Quantity Confirmation Modal State (Rule interception right after pantryService resolution)
  const [quantityModalItem, setQuantityModalItem] = useState<ResolvedPantryItem | null>(null);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
  const [quickSearchInput, setQuickSearchInput] = useState("");
  const [isQuickSearching, setIsQuickSearching] = useState(false);
  const [quickSearchError, setQuickSearchError] = useState<string | null>(null);

  // Toggle graph visibility state (defaults to false so the graph is not visible at all times, with localStorage preference memory)
  const [showInventoryGraph, setShowInventoryGraph] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pantry_show_health_graph");
      if (stored !== null) return stored === "true";
    }
    return false;
  });

  const toggleInventoryGraph = () => {
    setShowInventoryGraph((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("pantry_show_health_graph", String(next));
      }
      return next;
    });
  };

  const handleQuickLookupAndConfirm = async (queryText?: string) => {
    const query = (queryText !== undefined ? queryText : quickSearchInput).trim();
    if (!query) return;

    setIsQuickSearching(true);
    setQuickSearchError(null);
    try {
      const results = await unifiedPantrySearch(query);
      if (results && results.length > 0) {
        const top = results[0];
        setQuantityModalItem(top);
        setIsQuantityModalOpen(true);
        setQuickSearchInput("");
      } else {
        setQuickSearchError(`No product found for "${query}".`);
      }
    } catch (err: any) {
      setQuickSearchError(err.message || "Lookup failed.");
    } finally {
      setIsQuickSearching(false);
    }
  };

  // Queries & Mutations
  const { data: rawPantryItems = [], isLoading } = useQuery<PantryItem[]>({
    queryKey: ["pantry"],
    queryFn: () => recipeClient.pantry.list(),
  });

  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: () => recipeClient.recipes.list("-created_date"),
  });

  // Consolidate raw recipe measurements into unique master grocery products
  const consolidatedItems = useMemo(() => {
    return consolidatePantryItems(rawPantryItems);
  }, [rawPantryItems]);

  const createItemMutation = useMutation({
    mutationFn: (data: Partial<PantryItem>) => recipeClient.pantry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
      setNewItemName("");
      setNewItemQty("1");
      setIsAdding(false);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PantryItem> }) => recipeClient.pantry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => recipeClient.pantry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
    },
  });

  // Adjust stock quantity: Increment (+)
  const handleIncrementQuantity = async (item: ConsolidatedPantryItem) => {
    const nextQty = item.quantityNumber + 1;
    const nextStatus = "In Stock";

    // Update primary master item
    await updateItemMutation.mutateAsync({
      id: item.id,
      data: {
        name: item.name,
        quantity: `${nextQty} units`,
        status: nextStatus,
      },
    });

    // If there were duplicate previous entries that were consolidated, remove redundant ones to keep DB clean
    if (item.allIds.length > 1) {
      item.allIds.slice(1).forEach((id) => deleteItemMutation.mutate(id));
    }
  };

  // Adjust stock quantity: Decrement (-)
  const handleDecrementQuantity = async (item: ConsolidatedPantryItem) => {
    const nextQty = Math.max(0, item.quantityNumber - 1);
    const nextStatus = nextQty === 0 ? "Out of Stock" : nextQty === 1 ? "Running Low" : "In Stock";

    await updateItemMutation.mutateAsync({
      id: item.id,
      data: {
        name: item.name,
        quantity: `${nextQty} units`,
        status: nextStatus,
      },
    });

    if (item.allIds.length > 1) {
      item.allIds.slice(1).forEach((id) => deleteItemMutation.mutate(id));
    }
  };

  // Delete all underlying IDs for this consolidated master product
  const handleDeleteConsolidated = (item: ConsolidatedPantryItem) => {
    item.allIds.forEach((id) => deleteItemMutation.mutate(id));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const cleanTitle = canonicalizeIngredientName(newItemName.trim()) || cleanIngredientTitle(newItemName.trim()) || newItemName.trim();
    const qtyVal = parseInt(newItemQty, 10) || 1;

    createItemMutation.mutate({
      name: cleanTitle,
      category: newItemCategory,
      quantity: `${qtyVal} units`,
      status: qtyVal > 0 ? "In Stock" : "Out of Stock",
      purchase_date: newItemPurchaseDate ? new Date(newItemPurchaseDate).toISOString() : new Date().toISOString(),
      use_by_date: newItemUseByDate ? new Date(newItemUseByDate).toISOString() : undefined,
    });
  };

  // Active consolidated items (inventory > 0 and status !== "Out of Stock" per isPantryItemVisible)
  const activeConsolidatedItems = useMemo(() => {
    return consolidatedItems.filter((item) =>
      isPantryItemVisible({ quantity: item.quantityNumber, status: item.status })
    );
  }, [consolidatedItems]);

  // In Stock items (healthy stock: not out of stock and not running low)
  const inStockConsolidatedItems = useMemo(() => {
    return activeConsolidatedItems.filter((item) => {
      const isLow = item.quantityNumber === 1 || item.status === "Running Low";
      return !isLow;
    });
  }, [activeConsolidatedItems]);

  // Expiring items with Freshness Warning among active items
  const expiringWarningItems = useMemo(() => {
    return activeConsolidatedItems.filter((item) => isExpiringSoon(item));
  }, [activeConsolidatedItems]);

  // Running Low items among active items (1 unit or status === "Running Low")
  const runningLowConsolidatedItems = useMemo(() => {
    return activeConsolidatedItems.filter(
      (item) => item.quantityNumber === 1 || item.status === "Running Low"
    );
  }, [activeConsolidatedItems]);

  // Out of stock items (inventory <= 0 or status === "Out of Stock" per isPantryItemVisible)
  const outOfStockConsolidatedItems = useMemo(() => {
    return consolidatedItems.filter(
      (item) => !isPantryItemVisible({ quantity: item.quantityNumber, status: item.status })
    );
  }, [consolidatedItems]);

  // Filter consolidated pantry items:
  // 1. HIDE 'OUT OF STOCK' ITEMS BY DEFAULT:
  // If a product has an inventory count of "0 units", it must be hidden from the pantry grid by default so the shelves aren't cluttered.
  // A user should ONLY see "Out of Stock" items if they explicitly click the "Out of Stock" filter chip at the top.
  const filteredItems = useMemo(() => {
    return consolidatedItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const expiring = isExpiringSoon(item);
      const isVisible = isPantryItemVisible({ quantity: item.quantityNumber, status: item.status });
      const isLow = item.quantityNumber === 1 || item.status === "Running Low";

      if (statusFilter === "Out of Stock") {
        if (isVisible) return false;
      } else {
        // By default ("All", "In Stock", "Running Low", "Expiring Soon"), hide 'Out of Stock' items
        if (!isVisible) return false;

        if (statusFilter === "In Stock" && isLow) return false;
        if (statusFilter === "Expiring Soon" && !expiring) return false;
        if (statusFilter === "Running Low" && !isLow) return false;
      }

      return matchesSearch && matchesCategory;
    });
  }, [consolidatedItems, searchTerm, selectedCategory, statusFilter]);

  // SMART SUGGESTION ENGINE:
  // Recommends recipes to cook based on current pantry stock,
  // highlighting dishes that can be made with minimal additional ingredients.
  const [suggestionTab, setSuggestionTab] = useState<"all" | "ready" | "one-away" | "two-away">("all");
  const [addedGroceryFeedback, setAddedGroceryFeedback] = useState<Record<string, boolean>>({});

  const smartSuggestions: SmartRecipeSuggestion[] = useMemo(() => {
    return computeSmartRecipeSuggestions(recipes, consolidatedItems);
  }, [recipes, consolidatedItems]);

  const readyToCookList = useMemo(() => smartSuggestions.filter((s) => s.canCookNow), [smartSuggestions]);
  const oneAwayList = useMemo(() => smartSuggestions.filter((s) => s.missingCount === 1), [smartSuggestions]);
  const twoAwayList = useMemo(() => smartSuggestions.filter((s) => s.missingCount === 2), [smartSuggestions]);
  const minimalAdditionList = useMemo(() => smartSuggestions.filter((s) => s.isMinimalAddition), [smartSuggestions]);

  const filteredSuggestions = useMemo(() => {
    if (suggestionTab === "ready") return readyToCookList;
    if (suggestionTab === "one-away") return oneAwayList;
    if (suggestionTab === "two-away") return twoAwayList;
    return smartSuggestions;
  }, [suggestionTab, smartSuggestions, readyToCookList, oneAwayList, twoAwayList]);

  const handleAddMissingToGrocery = async (suggestion: SmartRecipeSuggestion, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      for (const item of suggestion.missingIngredients) {
        await recipeClient.grocery.create({
          name: item.raw || item.masterKey,
          quantity: `${item.requiredQuantity} units`,
          checked: false,
          category: "Produce",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["grocery"] });
      setAddedGroceryFeedback((prev) => ({ ...prev, [suggestion.recipe.id]: true }));
      setTimeout(() => {
        setAddedGroceryFeedback((prev) => ({ ...prev, [suggestion.recipe.id]: false }));
      }, 3500);
    } catch (err) {
      console.error("Failed to add missing ingredients to grocery list", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans pb-24 selection:bg-[#D95338]/20">
      
      {/* HEADER BAR */}
      <header className="border-b border-[#E6DFC6] dark:border-zinc-800 bg-[#FAF6EE]/90 dark:bg-zinc-950/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-[#E6DFC6] dark:border-zinc-800 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-900 cursor-pointer">
                <Home className="w-3.5 h-3.5 text-[#6E8B6B]" />
                <span>Workspace</span>
              </Button>
            </Link>
            <div className="h-4 w-px bg-[#E6DFC6] dark:bg-zinc-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-[#6E8B6B]/10 text-[#6E8B6B]">
                <ShoppingBag className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-serif font-semibold tracking-tight text-zinc-900 dark:text-white">
                Pantry Shelf Hub
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsAdding(true)}
              className="rounded-full bg-[#D95338] hover:bg-[#c2462e] text-white px-4 py-2 text-xs font-bold gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Ingredient</span>
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* REAL-TIME INVENTORY COUNTER BLOCK */}
        <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-[#E6DFC6] dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#6E8B6B]/10 text-[#6E8B6B] font-black text-lg">
              📦
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-zinc-400">Pantry Master Inventory</h2>
              <p className="text-sm font-extrabold text-zinc-900 dark:text-white">
                Unique Food Products Tracked in Kitchen
              </p>
            </div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-[#6E8B6B] text-white font-black text-lg shadow-sm font-mono">
            {activeConsolidatedItems.length}
          </div>
        </div>

        {/* UPC SCANNER & GLOBAL FALLBACK SEARCH FEATURE BANNER */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-900/40 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs shrink-0">
                <Barcode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5 flex-wrap">
                  <span>UPC Barcode & PLU Fallback Engine</span>
                  <span className="bg-amber-200 dark:bg-amber-950 text-amber-900 dark:text-amber-300 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">pantryService.ts</span>
                </h3>
                <p className="text-xs text-stone-600 dark:text-zinc-400 font-medium mt-0.5">
                  Scan barcodes, type 4/5-digit PLU codes (e.g. 4011, 94068), or search ingredients to customize quantity.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsUnifiedScannerOpen(true)}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold px-4 py-2 gap-1.5 shrink-0 shadow-xs cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Launch Camera Scanner</span>
              </Button>
              <Button
                onClick={() => {
                  setPantryModalTab("upc");
                  setIsPantryModalOpen(true);
                }}
                variant="outline"
                className="rounded-xl border-amber-500/40 text-amber-900 dark:text-amber-300 text-xs font-bold px-3 py-2 shrink-0 cursor-pointer"
              >
                <span>UPC Sync</span>
              </Button>
            </div>
          </div>

          {/* Inline Quick Lookup Bar with Instant Quantity Confirmation Modal Trigger */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleQuickLookupAndConfirm();
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-amber-500/20"
          >
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-700/60 dark:text-amber-400/60" />
              <input
                type="text"
                value={quickSearchInput}
                onChange={(e) => setQuickSearchInput(e.target.value)}
                placeholder="Quick lookup: barcode, 4/5-digit PLU (e.g. 4011, 94068), or product name..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white/90 dark:bg-zinc-850 border border-amber-300/60 dark:border-amber-800/60 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <Button
              type="submit"
              disabled={isQuickSearching || !quickSearchInput.trim()}
              className="w-full sm:w-auto px-4 py-2.5 text-xs rounded-xl bg-zinc-900 hover:bg-black text-white dark:bg-amber-600 dark:hover:bg-amber-700 font-bold shrink-0 cursor-pointer shadow-xs disabled:opacity-40 min-h-[44px]"
            >
              {isQuickSearching ? (
                <span className="flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Resolving...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Resolve & Set Quantity
                </span>
              )}
            </Button>
          </form>

          {quickSearchError && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{quickSearchError}</span>
            </p>
          )}
        </div>

        {/* PANTRY INVENTORY HEALTH DASHBOARD TOGGLE & D3.JS BAR CHART */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-[#6E8B6B]/15 text-[#6E8B6B]">
                <Activity className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Inventory Health Analytics
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-zinc-400">
                  D3 staple buffer levels and stock distribution
                </p>
              </div>
            </div>

            {/* Small toggle button to switch graph on or off */}
            <button
              type="button"
              onClick={toggleInventoryGraph}
              aria-expanded={showInventoryGraph}
              className={`w-full sm:w-auto justify-center px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs min-h-[40px] ${
                showInventoryGraph
                  ? "bg-[#6E8B6B]/15 hover:bg-[#6E8B6B]/25 text-[#6E8B6B] border-[#6E8B6B]/40"
                  : "bg-white dark:bg-zinc-800 hover:bg-stone-100 dark:hover:bg-zinc-700 text-stone-700 dark:text-stone-300 border-[#E6DFC6] dark:border-zinc-700"
              }`}
              title={showInventoryGraph ? "Hide inventory health graph" : "Show inventory health graph"}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{showInventoryGraph ? "Hide Graph" : "Show Graph"}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  showInventoryGraph ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {showInventoryGraph && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <PantryInventoryHealth 
                recipes={recipes} 
                consolidatedItems={consolidatedItems} 
                onToggleCollapse={toggleInventoryGraph}
              />
            </div>
          )}
        </section>

        {/* SMART SUGGESTION ENGINE: RECIPE RECOMMENDATION SHOWCASE */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-[#E6DFC6] dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6DFC6]/60 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-[#D95338]/10 text-[#D95338]">
                <ChefHat className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-serif font-bold text-zinc-900 dark:text-white">
                    Smart Suggestion Engine
                  </h3>
                  <span className="inline-flex items-center gap-1 bg-[#6E8B6B]/15 text-[#6E8B6B] text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-[#6E8B6B]/30 font-mono">
                    <Sparkles className="w-2.5 h-2.5" /> Active Stock
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                  Recommends recipes to cook based on current pantry stock, highlighting dishes that can be made with minimal additional ingredients.
                </p>
              </div>
            </div>

            {/* Metric Chips & Modal Trigger */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#6E8B6B]/15 text-[#6E8B6B] border border-[#6E8B6B]/30">
                ✨ {readyToCookList.length} Ready to Cook
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                ⚡ {oneAwayList.length} 1 Item Away
              </span>
              <Button
                onClick={() => setIsCookModalOpen(true)}
                size="sm"
                className="rounded-full bg-[#D95338] hover:bg-[#c2462e] text-white text-xs font-bold px-3.5 py-1.5 shadow-sm cursor-pointer ml-auto"
              >
                <span>View All ({smartSuggestions.length})</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>

          {/* Quick Carousel / Grid of Top Suggestions */}
          {smartSuggestions.length === 0 ? (
            <div className="text-center py-6 text-stone-400 dark:text-zinc-500 text-xs">
              Add more items to your pantry to unlock personalized culinary recipe suggestions.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {smartSuggestions.slice(0, 3).map((suggestion) => {
                const rec = suggestion.recipe;
                const isReady = suggestion.canCookNow;
                const isOneAway = suggestion.missingCount === 1;
                const isTwoAway = suggestion.missingCount === 2;
                const isAdded = !!addedGroceryFeedback[rec.id];

                return (
                  <div
                    key={rec.id}
                    onClick={() => navigate(`/recipes/${rec.id}`)}
                    className="p-4 rounded-2xl bg-[#FAF6EE]/80 dark:bg-zinc-800/60 border border-[#E6DFC6] dark:border-zinc-700/80 hover:border-[#D95338]/50 transition-all flex flex-col justify-between gap-3 group cursor-pointer shadow-2xs hover:shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {isReady ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#6E8B6B] text-white shadow-2xs">
                            <Check className="w-3 h-3 stroke-[3]" /> Ready to Cook
                          </span>
                        ) : isOneAway ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                            <Zap className="w-3 h-3 fill-white" /> Minimal: 1 Item Away
                          </span>
                        ) : isTwoAway ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-600 text-white shadow-2xs">
                            <ShoppingCart className="w-3 h-3" /> 2 Items Away
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-stone-200 dark:bg-zinc-700 text-stone-700 dark:text-zinc-300">
                            {suggestion.inStockCount}/{suggestion.totalIngredients} In Stock
                          </span>
                        )}

                        <span className="text-[11px] font-mono font-bold text-stone-500">
                          {suggestion.matchPercentage}% Stocked
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-[#D95338] transition-colors line-clamp-1">
                        {rec.title}
                      </h4>

                      <div className="flex items-center gap-3 text-[11px] text-stone-500">
                        {rec.cook_time && <span>⏱ {rec.cook_time}</span>}
                        <span>🥘 {suggestion.totalIngredients} ingredients</span>
                      </div>

                      {/* In Stock & Missing Breakdown Pills */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex flex-wrap gap-1">
                          {suggestion.inStockIngredients.slice(0, 3).map((item, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[9px] font-medium bg-[#6E8B6B]/15 text-[#6E8B6B] px-1.5 py-0.5 rounded-md">
                              <Check className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[100px]">{item.masterKey}</span>
                            </span>
                          ))}
                          {suggestion.inStockIngredients.length > 3 && (
                            <span className="text-[9px] text-[#6E8B6B] font-bold px-1 py-0.5">
                              +{suggestion.inStockIngredients.length - 3} more
                            </span>
                          )}
                        </div>

                        {suggestion.missingIngredients.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {suggestion.missingIngredients.slice(0, 2).map((item, i) => (
                              <span key={i} className="inline-flex items-center gap-1 text-[9px] font-medium bg-[#D95338]/10 text-[#D95338] px-1.5 py-0.5 rounded-md border border-[#D95338]/20">
                                <AlertCircle className="w-2.5 h-2.5" />
                                <span className="truncate max-w-[120px]">Need {item.raw || item.masterKey}</span>
                              </span>
                            ))}
                            {suggestion.missingIngredients.length > 2 && (
                              <span className="text-[9px] text-[#D95338] font-bold px-1 py-0.5">
                                +{suggestion.missingIngredients.length - 2} missing
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-[#E6DFC6]/60 dark:border-zinc-700/60 flex items-center justify-between gap-2 mt-auto">
                      {suggestion.missingIngredients.length > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => handleAddMissingToGrocery(suggestion, e)}
                          className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                            isAdded
                              ? "bg-[#6E8B6B] text-white border-[#6E8B6B]"
                              : "bg-white dark:bg-zinc-800 text-stone-700 dark:text-zinc-200 border-[#E6DFC6] dark:border-zinc-700 hover:border-[#D95338] hover:text-[#D95338]"
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Added to List!</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>Add Missing ({suggestion.missingCount})</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#6E8B6B] font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Ready to cook now
                        </span>
                      )}

                      <span className="text-xs font-bold text-[#D95338] group-hover:translate-x-0.5 transition-transform flex items-center gap-1 shrink-0 ml-auto">
                        <span>Cook</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* SEARCH & CATEGORY CONTROLS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products (e.g. Heavy Cream, Cheddar Cheese, Flour)..."
              className="w-full pl-11 pr-4 py-3 rounded-full bg-white/80 dark:bg-zinc-900/80 border border-[#E6DFC6] dark:border-zinc-800 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#D95338] transition-all shadow-xs"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Badges */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setStatusFilter("All")}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === "All"
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs"
                  : "bg-white/70 dark:bg-zinc-900 text-stone-600 dark:text-zinc-400 border border-[#E6DFC6] dark:border-zinc-800 hover:bg-stone-100"
              }`}
            >
              All Products ({activeConsolidatedItems.length})
            </button>
            <button
              onClick={() => setStatusFilter("In Stock")}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === "In Stock"
                  ? "bg-[#6E8B6B] text-white shadow-xs"
                  : "bg-[#6E8B6B]/10 text-[#6E8B6B] border border-[#6E8B6B]/20 hover:bg-[#6E8B6B]/20"
              }`}
            >
              In Stock ({inStockConsolidatedItems.length})
            </button>
            <button
              onClick={() => setStatusFilter("Expiring Soon")}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                statusFilter === "Expiring Soon"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Freshness Warning ({expiringWarningItems.length})</span>
            </button>
            <button
              onClick={() => setStatusFilter("Running Low")}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === "Running Low"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
              }`}
            >
              Running Low ({runningLowConsolidatedItems.length})
            </button>
            <button
              onClick={() => setStatusFilter("Out of Stock")}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === "Out of Stock"
                  ? "bg-[#D95338] text-white shadow-xs"
                  : "bg-[#D95338]/10 text-[#D95338] border border-[#D95338]/20 hover:bg-[#D95338]/20"
              }`}
            >
              Out of Stock ({outOfStockConsolidatedItems.length})
            </button>
          </div>
        </div>

        {/* CATEGORY CHIPS SCROLL ROW */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-[#E6DFC6]/60 dark:border-zinc-800">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#6E8B6B] text-white font-semibold shadow-xs"
                  : "bg-white/60 dark:bg-zinc-900 text-stone-700 dark:text-zinc-300 border border-[#E6DFC6] dark:border-zinc-800 hover:bg-stone-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 1. THE SHELF GRID LAYOUT */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-stone-200/50 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white/70 dark:bg-zinc-900/60 rounded-3xl border border-[#E6DFC6] dark:border-zinc-800 p-12 text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-stone-300 dark:text-zinc-700 mx-auto" />
            <h3 className="text-lg font-serif font-medium text-zinc-900 dark:text-white">No Pantry Items Found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {searchTerm || selectedCategory !== "All" || statusFilter !== "All"
                ? "Try clearing your filters or search query to see all inventory items."
                : "Add ingredients to track stock levels, receive shelf-life notifications, and cook seamlessly."}
            </p>
            <Button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("All");
                setStatusFilter("All");
                setIsAdding(true);
              }}
              className="rounded-full bg-[#D95338] hover:bg-[#c2462e] text-white px-6 py-2.5 text-xs font-bold"
            >
              Add Product to Pantry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredItems.map((item) => {
              const expiring = isExpiringSoon(item);
              const freshness = item.freshness;
              const hasFreshnessWarning = expiring || freshness?.isNearingUseBy || freshness?.isExpired || Boolean((item.rawItem as any)?.freshness_warning);
              const emoji = getProductEmoji(item.category, item.name);
              const isOut = item.quantityNumber <= 0 || item.status === "Out of Stock";
              const isLow = !isOut && (item.quantityNumber === 1 || item.status === "Running Low");

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative bg-[#FDFBF7] dark:bg-zinc-900 border border-[#E6DFC6] dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg transition-all duration-300 shadow-xs select-none"
                >
                  {/* Top Row: Category Emoji & Badges */}
                  <div className="flex items-start justify-between gap-1 w-full">
                    <span className="text-2xl p-2 rounded-xl bg-[#FAF6EE] dark:bg-zinc-800 border border-[#E6DFC6]/50 dark:border-zinc-700 shadow-2xs">
                      {emoji}
                    </span>

                    {/* Stock Status & Freshness Warning Badges */}
                    <div className="flex flex-col items-end gap-1">
                      {/* Freshness Warning Badge */}
                      {hasFreshnessWarning && !isOut && (
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-2xs animate-pulse"
                          title={freshness?.useByDateString ? `Use by ${freshness.useByDateString} (${freshness.daysRemaining} days left)` : "Nearing recommended use-by or purchase date"}
                        >
                          <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>Freshness Warning</span>
                        </span>
                      )}

                      {/* Stock Status Badge */}
                      {isOut ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-[#D95338]/15 text-[#D95338] dark:text-[#ea6a4f] border border-[#D95338]/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D95338]" />
                          <span>Out of Stock</span>
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Running Low</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-[#6E8B6B]/15 text-[#6E8B6B] border border-[#6E8B6B]/30">
                          <span>In Stock</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Item: Clean Product Title, Category & Date-Tracking Info */}
                  <div className="my-2 space-y-1 text-left">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-[#D95338] transition-colors" title={item.name}>
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-zinc-400 line-clamp-1">
                      {item.category}
                    </p>

                    {/* Date-Tracking diagnostics */}
                    {freshness && (
                      <div className="flex items-center gap-1 text-[10px] font-mono text-stone-500 dark:text-zinc-400 pt-0.5">
                        <Calendar className="w-3 h-3 text-stone-400 shrink-0" />
                        <span className={hasFreshnessWarning && !isOut ? "text-amber-700 dark:text-amber-300 font-bold" : ""}>
                          Use by: {freshness.useByDateString}
                        </span>
                        {freshness.daysRemaining !== undefined && !isOut && (
                          <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                            freshness.daysRemaining <= 3 
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" 
                              : "text-stone-400"
                          }`}>
                            ({freshness.daysRemaining < 0 ? "Past" : `${freshness.daysRemaining}d`})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Grocery Fulfillment Trigger on Out of Stock / Low Stock (Gated by IS_AFFILIATE_ENABLED) */}
                  {IS_AFFILIATE_ENABLED && (isOut || isLow) && (
                    <div className="mb-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeliveryTargetIngredient(item.name);
                        }}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-white/90 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-700 border border-[#D95338]/35 hover:border-[#D95338]/70 text-[#D95338] dark:text-[#ea6a4f] text-[10.5px] font-extrabold shadow-2xs backdrop-blur-xs transition-all active:scale-95 cursor-pointer"
                        title={`Order ${item.name} via grocery delivery`}
                      >
                        <span>🛒 Order from Store</span>
                      </button>
                    </div>
                  )}

                  {/* Bottom Counter & Inventory Controller */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E6DFC6]/40 dark:border-zinc-800/80">
                    {/* Interactive Stock Level Controller */}
                    <div className="flex items-center gap-1.5 bg-[#FAF6EE] dark:bg-zinc-800 p-1 rounded-full border border-[#E6DFC6]/60 dark:border-zinc-700 shadow-2xs">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDecrementQuantity(item);
                        }}
                        disabled={item.quantityNumber <= 0}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-stone-600 dark:text-zinc-300 hover:bg-stone-200/80 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer active:scale-95"
                        title="Decrease stock level"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-stone-800 dark:text-zinc-200 px-1 min-w-[48px] text-center select-none">
                        {item.quantityNumber} {item.quantityNumber === 1 ? "unit" : "units"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleIncrementQuantity(item);
                        }}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-stone-600 dark:text-zinc-300 hover:bg-stone-200/80 dark:hover:bg-zinc-700 transition-colors cursor-pointer active:scale-95"
                        title="Increase stock level"
                      >
                        +
                      </button>
                    </div>

                    {/* Delete Item Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConsolidated(item);
                      }}
                      className="text-stone-400 hover:text-[#D95338] w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-center"
                      title={`Remove ${item.name} from pantry`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* 3. SMART SUGGESTION ENGINE FLOATING ACTION BUTTON (FAB) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsCookModalOpen(true)}
          className="group px-6 py-3.5 rounded-full bg-[#D95338] hover:bg-[#c2462e] text-white font-bold text-sm tracking-wide shadow-xl shadow-[#D95338]/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2.5 cursor-pointer active:scale-95"
        >
          <ChefHat className="w-5 h-5 text-amber-200 group-hover:rotate-12 transition-transform" />
          <span>Smart Suggestions</span>
          <span className="px-2 py-0.5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-mono font-bold">
            {readyToCookList.length > 0 ? `✨ ${readyToCookList.length} Ready` : `${smartSuggestions.length} Matches`}
          </span>
        </button>
      </div>

      {/* ADD INGREDIENT MODAL */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FAF6EE] dark:bg-zinc-900 border border-[#E6DFC6] dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[#E6DFC6] dark:border-zinc-800 pb-3">
                <h3 className="text-lg font-serif font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-[#D95338]" />
                  <span>Add Product to Pantry</span>
                </h3>
                <button onClick={() => setIsAdding(false)} className="text-stone-400 hover:text-stone-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                    Product / Ingredient Name
                  </label>
                  <Input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g. Heavy Cream, Cheddar Cheese, Flour"
                    required
                    className="rounded-xl border-[#E6DFC6] dark:border-zinc-800 focus:ring-[#D95338]"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Measurements are automatically normalized into canonical master products.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Category
                    </label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full rounded-xl border border-[#E6DFC6] dark:border-zinc-800 bg-white dark:bg-zinc-850 p-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D95338]"
                    >
                      {CATEGORIES.filter((c) => c !== "All").map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Stock Level (Units)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      placeholder="1"
                      className="rounded-xl border-[#E6DFC6] dark:border-zinc-800 focus:ring-[#D95338]"
                    />
                  </div>
                </div>

                {/* Date-Tracking fields */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#E6DFC6]/50 dark:border-zinc-800">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>Purchase Date</span>
                    </label>
                    <Input
                      type="date"
                      value={newItemPurchaseDate}
                      onChange={(e) => setNewItemPurchaseDate(e.target.value)}
                      className="rounded-xl border-[#E6DFC6] dark:border-zinc-800 text-xs focus:ring-[#D95338]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Use-By Date</span>
                    </label>
                    <Input
                      type="date"
                      value={newItemUseByDate}
                      onChange={(e) => setNewItemUseByDate(e.target.value)}
                      placeholder="Auto if blank"
                      className="rounded-xl border-[#E6DFC6] dark:border-zinc-800 text-xs focus:ring-[#D95338]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      if (newItemName.trim()) {
                        handleQuickLookupAndConfirm(newItemName.trim());
                        setIsAdding(false);
                      }
                    }}
                    disabled={!newItemName.trim()}
                    variant="outline"
                    className="rounded-xl border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-bold px-3 py-2 cursor-pointer shadow-xs gap-1.5 disabled:opacity-40"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Auto-Identify & Open Stepper</span>
                  </Button>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsAdding(false)}
                      className="rounded-xl text-xs font-bold text-stone-500 cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="rounded-xl bg-[#D95338] hover:bg-[#c2462e] text-white text-xs font-bold px-5 cursor-pointer shadow-sm"
                    >
                      Save to Pantry
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SMART SUGGESTION ENGINE MODAL */}
      <AnimatePresence>
        {isCookModalOpen && (
          <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FAF6EE] dark:bg-zinc-900 border border-[#E6DFC6] dark:border-zinc-800 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[88vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E6DFC6] dark:border-zinc-800 pb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="p-2.5 rounded-2xl bg-[#D95338]/10 text-[#D95338]">
                    <ChefHat className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-serif font-bold text-zinc-900 dark:text-white">
                        Smart Suggestion Engine
                      </h3>
                      <span className="inline-flex items-center gap-1 bg-[#6E8B6B]/15 text-[#6E8B6B] text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-[#6E8B6B]/30 font-mono">
                        <Sparkles className="w-2.5 h-2.5" /> AI Matcher
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-zinc-400">
                      Dishes recommended based on your pantry stock — highlighting recipes with minimal additional ingredients.
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsCookModalOpen(false)} className="text-stone-400 hover:text-stone-600 cursor-pointer p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSuggestionTab("all")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    suggestionTab === "all"
                      ? "bg-[#D95338] text-white shadow-xs"
                      : "bg-white/80 dark:bg-zinc-800/80 text-stone-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  All Matches ({smartSuggestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestionTab("ready")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    suggestionTab === "ready"
                      ? "bg-[#6E8B6B] text-white shadow-xs"
                      : "bg-white/80 dark:bg-zinc-800/80 text-stone-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Ready to Cook ({readyToCookList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestionTab("one-away")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    suggestionTab === "one-away"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-white/80 dark:bg-zinc-800/80 text-stone-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>1 Item Away ({oneAwayList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestionTab("two-away")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    suggestionTab === "two-away"
                      ? "bg-sky-600 text-white shadow-xs"
                      : "bg-white/80 dark:bg-zinc-800/80 text-stone-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <ShoppingCart className="w-3 h-3" />
                  <span>2 Items Away ({twoAwayList.length})</span>
                </button>
              </div>

              {/* Suggestions List */}
              <div className="overflow-y-auto space-y-3.5 flex-1 pr-1">
                {filteredSuggestions.length === 0 ? (
                  <div className="text-center py-10 text-stone-500 space-y-2">
                    <p className="text-sm font-medium">No recipes found for the selected filter.</p>
                    <p className="text-xs">Add more items to your pantry or select "All Matches".</p>
                  </div>
                ) : (
                  filteredSuggestions.map((suggestion) => {
                    const rec = suggestion.recipe;
                    const isReady = suggestion.canCookNow;
                    const isOneAway = suggestion.missingCount === 1;
                    const isTwoAway = suggestion.missingCount === 2;
                    const isAdded = !!addedGroceryFeedback[rec.id];

                    return (
                      <div
                        key={rec.id}
                        className="p-4 rounded-2xl bg-white dark:bg-zinc-800/90 border border-[#E6DFC6] dark:border-zinc-700/80 space-y-3 shadow-2xs hover:border-[#D95338]/40 transition-all"
                      >
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4
                              onClick={() => navigate(`/recipes/${rec.id}`)}
                              className="text-base font-bold text-zinc-900 dark:text-white hover:text-[#D95338] transition-colors cursor-pointer"
                            >
                              {rec.title}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
                              {rec.cook_time && <span>⏱ {rec.cook_time}</span>}
                              {rec.servings && <span>👥 {rec.servings} servings</span>}
                              <span>🥘 {suggestion.totalIngredients} total ingredients</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center">
                            {isReady ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#6E8B6B] text-white shadow-2xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" /> Ready to Cook
                              </span>
                            ) : isOneAway ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                                <Zap className="w-3.5 h-3.5 fill-white" /> Minimal: 1 Item Away
                              </span>
                            ) : isTwoAway ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-sky-600 text-white shadow-2xs">
                                <ShoppingCart className="w-3.5 h-3.5" /> 2 Items Away
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-stone-200 dark:bg-zinc-700 text-stone-700 dark:text-zinc-300">
                                {suggestion.inStockCount}/{suggestion.totalIngredients} In Stock
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stock Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-medium text-stone-500">
                            <span>Pantry Stock Satisfaction</span>
                            <span className="font-mono font-bold text-zinc-900 dark:text-white">{suggestion.matchPercentage}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-stone-100 dark:bg-zinc-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isReady ? "bg-[#6E8B6B]" : isOneAway ? "bg-amber-500" : "bg-[#D95338]"
                              }`}
                              style={{ width: `${suggestion.matchPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Breakdown: In Stock vs Missing */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* In Stock Items */}
                          <div className="p-2.5 rounded-xl bg-[#6E8B6B]/10 border border-[#6E8B6B]/20 space-y-1.5">
                            <h5 className="text-[11px] font-bold text-[#6E8B6B] uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>In Stock ({suggestion.inStockCount})</span>
                            </h5>
                            <div className="space-y-1">
                              {suggestion.inStockIngredients.map((ing, i) => (
                                <div key={i} className="text-xs text-zinc-800 dark:text-zinc-200 flex items-start gap-1.5">
                                  <span className="text-[#6E8B6B] mt-0.5">✓</span>
                                  <div className="min-w-0">
                                    <span className="font-medium truncate">{ing.raw}</span>
                                    {ing.isEggPart && (
                                      <span className="block text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                                        🥚 1:1 mapped to pantry Eggs
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Missing Items */}
                          <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 space-y-1.5">
                            <h5 className="text-[11px] font-bold text-[#D95338] uppercase tracking-wider flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Missing to Cook ({suggestion.missingCount})</span>
                            </h5>
                            {suggestion.missingCount === 0 ? (
                              <p className="text-xs text-[#6E8B6B] font-medium pt-1">
                                ✨ You have 100% of the required ingredients in stock!
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {suggestion.missingIngredients.map((ing, i) => (
                                  <div key={i} className="text-xs text-stone-700 dark:text-zinc-300 flex items-center gap-1.5">
                                    <span className="text-[#D95338]">✗</span>
                                    <span className="font-medium truncate">{ing.raw}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Modal Card Footer Actions */}
                        <div className="pt-2 border-t border-[#E6DFC6]/60 dark:border-zinc-700/60 flex flex-wrap items-center justify-between gap-2">
                          {suggestion.missingCount > 0 ? (
                            <Button
                              type="button"
                              onClick={(e) => handleAddMissingToGrocery(suggestion, e)}
                              size="sm"
                              variant="outline"
                              className={`text-xs font-bold rounded-xl gap-1.5 cursor-pointer ${
                                isAdded
                                  ? "bg-[#6E8B6B] text-white border-[#6E8B6B]"
                                  : "border-stone-300 dark:border-zinc-700 text-stone-700 dark:text-zinc-300 hover:text-[#D95338]"
                              }`}
                            >
                              {isAdded ? (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Added to Grocery List!</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add {suggestion.missingCount} Missing to Grocery List</span>
                                </>
                              )}
                            </Button>
                          ) : (
                            <span className="text-xs text-[#6E8B6B] font-bold flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" /> All ingredients ready in kitchen
                            </span>
                          )}

                          <Button
                            onClick={() => navigate(`/recipes/${rec.id}`)}
                            size="sm"
                            className="rounded-xl bg-[#D95338] hover:bg-[#c2462e] text-white text-xs font-bold gap-1 cursor-pointer ml-auto shadow-xs"
                          >
                            <ChefHat className="w-3.5 h-3.5" />
                            <span>Start Cooking</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UPC & GROCERY MODAL */}
      <PantryModal
        isOpen={isPantryModalOpen}
        onClose={() => setIsPantryModalOpen(false)}
        initialTab={pantryModalTab}
        isPage={false}
      />

      {/* STORE DELIVERY DRAWER (Gated by IS_AFFILIATE_ENABLED) */}
      {IS_AFFILIATE_ENABLED && deliveryTargetIngredient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Order "{deliveryTargetIngredient}"
                </h3>
                <p className="text-xs text-stone-500">Select grocery store for direct fulfillment</p>
              </div>
              <button onClick={() => setDeliveryTargetIngredient(null)} className="text-stone-400 hover:text-stone-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { name: "Instacart", desc: "Fast grocery delivery from multiple local stores", icon: "🛒" },
                { name: "Walmart", desc: "Affordable groceries & household essentials", icon: "🏬" },
                { name: "Voilà by Sobeys", desc: "Fresh grocery delivery directly from warehouse", icon: "🥦" },
              ].map((store) => (
                <button
                  key={store.name}
                  onClick={() => {
                    triggerAffiliateFulfillment(store.name, deliveryTargetIngredient);
                    setDeliveryTargetIngredient(null);
                  }}
                  className="w-full p-3 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 hover:bg-stone-100 dark:hover:bg-zinc-800 border border-stone-200 dark:border-zinc-700 flex items-center justify-between cursor-pointer transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{store.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{store.name}</h4>
                      <p className="text-[10.5px] text-stone-500">{store.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* QUANTITY CONFIRMATION STEPPER MODAL */}
      <QuantityConfirmationModal
        isOpen={isQuantityModalOpen}
        onClose={() => setIsQuantityModalOpen(false)}
        resolvedItem={quantityModalItem}
        onSuccess={() => {
          setQuantityModalItem(null);
        }}
      />

      {/* UNIFIED SEARCH & SCANNER OVERLAY */}
      <UnifiedSearchOverlay
        isOpen={isUnifiedScannerOpen}
        onClose={() => setIsUnifiedScannerOpen(false)}
      />
    </div>
  );
}

export default PantryHub;
