/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeClient } from "../../api/recipeClient";
import { PantryItem, Recipe, GroceryItem, GrocerySettings, MealPlan } from "../../types";
import { 
  X, Search, Plus, Trash2, Tag, Check, RefreshCw, AlertCircle, 
  ShoppingBag, Eye, Store, DollarSign, Barcode, Camera, Sparkles, 
  CheckSquare, Square, Settings, ChevronRight, HelpCircle, Home 
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button";
import { KitchenLogo } from "../ui/KitchenLogo";
import { Input } from "../ui/input";
import { Html5Qrcode } from "html5-qrcode";
import { StoreComparison } from "./StoreComparison";
import { QuantityConfirmationModal, ResolvedPantryItem } from "./QuantityConfirmationModal";
import { isPantryItemVisible } from "../../services/pantryService";

interface PantryModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isPage?: boolean;
  initialTab?: "pantry" | "grocery" | "upc";
}

const CATEGORIES = [
  "Produce",
  "Dairy & Eggs",
  "Proteins",
  "Pantry Staples",
  "Grains & Baking",
  "Spices & Oils",
  "Other"
];

const STORES_LIST = [
  // --- Popular Canadian Chains ---
  "Loblaws",
  "Real Canadian Superstore",
  "Sobeys",
  "Metro",
  "No Frills",
  "Food Basics",
  "FreshCo",
  "Costco Canada",
  "Walmart Canada",
  "Shoppers Drug Mart",
  // --- Small & Specialty Canadian Stores ---
  "T&T Supermarket",
  "Farm Boy",
  "Nations Fresh Foods",
  "Bulk Barn",
  "Rabba Fine Foods",
  "Corner Grocer",
  "Local Farmers Market",
  // --- US / International ---
  "Whole Foods", 
  "Trader Joe's", 
  "Kroger", 
  "Safeway", 
  "Costco", 
  "Target", 
  "Local Market"
];

const PROVINCIAL_TAX_RATES: Record<string, { name: string; gst: number; pst: number; hst: number; notes: string }> = {
  "ON": { name: "Ontario", gst: 0, pst: 0, hst: 0.13, notes: "13% HST applies to taxable products; basic fresh groceries are tax-exempt (0%)." },
  "BC": { name: "British Columbia", gst: 0.05, pst: 0.07, hst: 0, notes: "5% GST + 7% PST applies to taxable products; basic fresh groceries are exempt." },
  "QC": { name: "Quebec", gst: 0.05, pst: 0.09975, hst: 0, notes: "5% GST + 9.975% QST applies; basic foods are tax-exempt." },
  "AB": { name: "Alberta", gst: 0.05, pst: 0, hst: 0, notes: "5% GST only, no provincial sales tax applies to grocery items." },
  "MB": { name: "Manitoba", gst: 0.05, pst: 0.07, hst: 0, notes: "5% GST + 7% RST; basic ingredients are tax-free." },
  "SK": { name: "Saskatchewan", gst: 0.05, pst: 0.06, hst: 0, notes: "5% GST + 6% PST; basic foods are tax-exempt." },
  "NS": { name: "Nova Scotia", gst: 0, pst: 0, hst: 0.15, notes: "15% HST applies; basic groceries are tax-exempt (0%)." },
  "NB": { name: "New Brunswick", gst: 0, pst: 0, hst: 0.15, notes: "15% HST applies; basic fresh foods are tax-exempt." },
  "PE": { name: "Prince Edward Island", gst: 0, pst: 0, hst: 0.15, notes: "15% HST applies; basic groceries are tax-free." },
  "NL": { name: "Newfoundland & Labrador", gst: 0, pst: 0, hst: 0.15, notes: "15% HST applies; basic groceries are tax-exempt." },
  "YT": { name: "Yukon", gst: 0.05, pst: 0, hst: 0, notes: "5% GST only, no territorial sales tax." },
  "NT": { name: "Northwest Territories", gst: 0.05, pst: 0, hst: 0, notes: "5% GST only, no territorial sales tax." },
  "NU": { name: "Nunavut", gst: 0.05, pst: 0, hst: 0, notes: "5% GST only, no territorial sales tax." },
  "US": { name: "United States", gst: 0, pst: 0, hst: 0, notes: "No standard federal or state sales tax on grocery ingredients applied." }
};

const MOCK_BARCODES = [
  { upc: "041196910123", name: "Organic Whole Milk", category: "Dairy & Eggs", qty: "1 Gallon", price: 4.29, brand: "Horizon Organic" },
  { upc: "011110038472", name: "Cage-Free Large Eggs", category: "Dairy & Eggs", qty: "1 Dozen", price: 3.49, brand: "Eggland's Best" },
  { upc: "023456789012", name: "Fresh Hass Avocados", category: "Produce", qty: "4 units", price: 4.99, brand: "Hass Growers" },
  { upc: "072250037125", name: "Sourdough Bread Loaf", category: "Grains & Baking", qty: "1 loaf", price: 4.50, brand: "San Francisco Sourdough" },
  { upc: "033383020112", name: "Extra Virgin Olive Oil", category: "Spices & Oils", qty: "500ml", price: 11.99, brand: "Filippo Berio" },
  { upc: "049000000443", name: "Sparkling Seltzer Pack", category: "Other", qty: "12 Pack", price: 5.99, brand: "LaCroix" }
];

const getStorageState = (item: PantryItem) => {
  const nameLower = item.name.toLowerCase();
  const catLower = item.category.toLowerCase();
  if (nameLower.includes("frozen") || nameLower.includes("ice cream") || nameLower.includes("freezer") || nameLower.includes("berries")) {
    return { icon: "❄️", label: "Freezer" };
  }
  if (
    catLower.includes("dairy") || 
    catLower.includes("eggs") || 
    catLower.includes("produce") || 
    catLower.includes("proteins") ||
    nameLower.includes("milk") ||
    nameLower.includes("yogurt") ||
    nameLower.includes("cheese") ||
    nameLower.includes("butter") ||
    nameLower.includes("spinach") ||
    nameLower.includes("lettuce") ||
    nameLower.includes("salad") ||
    nameLower.includes("chicken") ||
    nameLower.includes("beef") ||
    nameLower.includes("meat") ||
    nameLower.includes("fish") ||
    nameLower.includes("shrimp")
  ) {
    return { icon: "🥶", label: "Fridge" };
  }
  return { icon: "🧺", label: "Ambient Cabinet" };
};

const getCategoryEmojiWeb = (category: string, name: string): string => {
  const search = (category + " " + name).toLowerCase();
  if (search.includes("steak") || search.includes("meat") || search.includes("poultry") || search.includes("chicken") || search.includes("beef") || search.includes("pork") || search.includes("bacon")) return "🥩";
  if (search.includes("salmon") || search.includes("fish") || search.includes("shrimp") || search.includes("seafood") || search.includes("tuna")) return "🐟";
  if (search.includes("avocado") || search.includes("spinach") || search.includes("sprouts") || search.includes("vegetable") || search.includes("produce") || search.includes("salad") || search.includes("lettuce") || search.includes("blueberry") || search.includes("fruit") || search.includes("apple") || search.includes("banana")) return "🥦";
  if (search.includes("yogurt") || search.includes("milk") || search.includes("egg") || search.includes("cheese") || search.includes("butter") || search.includes("dairy")) return "🥛";
  if (search.includes("bread") || search.includes("bakery") || search.includes("cookie") || search.includes("pastry") || search.includes("sourdough")) return "🥐";
  if (search.includes("rice") || search.includes("grain") || search.includes("baking") || search.includes("flour") || search.includes("pasta")) return "🌾";
  if (search.includes("paprika") || search.includes("oil") || search.includes("spice") || search.includes("salt") || search.includes("seasoning") || search.includes("pepper")) return "🧂";
  if (search.includes("bean") || search.includes("tomato") || search.includes("canned") || search.includes("staple") || search.includes("soup")) return "🥫";
  if (search.includes("coffee") || search.includes("tea") || search.includes("matcha") || search.includes("beverage") || search.includes("juice")) return "☕";
  return "🍳";
};

const getSimulatedShelfLifeDays = (item: { id: string; name: string; category: string }): number => {
  const nameLower = item.name.toLowerCase();
  // Simulate low shelf life for fresh dairy, vegetables and meats
  if (
    nameLower.includes("milk") || 
    nameLower.includes("yogurt") || 
    nameLower.includes("spinach") || 
    nameLower.includes("chicken") || 
    nameLower.includes("salad") || 
    nameLower.includes("greek") ||
    nameLower.includes("egg") ||
    nameLower.includes("beef")
  ) {
    return 1; // less than 2, so expiring soon
  }
  return 15; // default safe shelf life
};

export function PantryModal({ isOpen = true, onClose, isPage = false, initialTab = "pantry" }: PantryModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pantry" | "grocery" | "upc">(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem("kitchen_is_premium") === "true";
  });
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // -------------------------
  // TAB 1: PANTRY INVENTORY STATE
  // -------------------------
  const [pantrySearch, setPantrySearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [pantryStatusFilter, setPantryStatusFilter] = useState<"All" | "LowOrOut">("All");
  const [selectedSmartStatus, setSelectedSmartStatus] = useState<"Expiring Soon" | "Low Stock" | "Need to Buy" | "Recently Added" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All Items");
  const [isAddingPantry, setIsAddingPantry] = useState(false);
  const [newPantryName, setNewPantryName] = useState("");
  const [newPantryCategory, setNewPantryCategory] = useState(CATEGORIES[0]);
  const [newPantryQuantity, setNewPantryQuantity] = useState("");
  const [newPantryStatus, setNewPantryStatus] = useState<"In Stock" | "Running Low" | "Out of Stock">("In Stock");

  // -------------------------
  // TAB 2: GROCERY SHOPPING LIST STATE
  // -------------------------
  const [grocSearch, setGrocSearch] = useState("");
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>("All");
  
  // Quick Add Grocery state
  const [newGrocName, setNewGrocName] = useState("");
  const [newGrocPrice, setNewGrocPrice] = useState("");
  const [newGrocQty, setNewGrocQty] = useState("");
  const [newGrocCategory, setNewGrocCategory] = useState(CATEGORIES[0]);
  const [newGrocStore, setNewGrocStore] = useState("");

  // Budget configuration settings states
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsDefaultStore, setSettingsDefaultStore] = useState("");
  const [settingsBudget, setSettingsBudget] = useState("");
  const [isGeneratingSmartList, setIsGeneratingSmartList] = useState(false);

  // Canadian Province Tax District State
  const [selectedProvince, setSelectedProvince] = useState<string>(() => {
    return localStorage.getItem("kitchen_selected_province") || "ON";
  });

  // Trip Budgets State (Changeable for each shopping trip, mapping store names to custom limits)
  const [tripBudgets, setTripBudgets] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("kitchen_trip_budgets");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Individual grocery item tax overrides (by Item ID)
  const [taxOverrides, setTaxOverrides] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("kitchen_tax_overrides");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Sync states to local storage on changes
  React.useEffect(() => {
    localStorage.setItem("kitchen_selected_province", selectedProvince);
  }, [selectedProvince]);

  React.useEffect(() => {
    localStorage.setItem("kitchen_trip_budgets", JSON.stringify(tripBudgets));
  }, [tripBudgets]);

  React.useEffect(() => {
    localStorage.setItem("kitchen_tax_overrides", JSON.stringify(taxOverrides));
  }, [taxOverrides]);

  // -------------------------
  // TAB 3: UPC SCANNER STATE
  // -------------------------
  const [manualUpcInput, setManualUpcInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<{ 
    upc: string; 
    name: string; 
    brand: string; 
    category: string; 
    qty: string; 
    price: number; 
    plu_code?: string | null; 
    is_organic?: boolean; 
    source?: string;
  } | null>(null);
  const [quantityConfirmItem, setQuantityConfirmItem] = useState<ResolvedPantryItem | null>(null);
  const [isQuantityConfirmOpen, setIsQuantityConfirmOpen] = useState(false);
  const [scanNotification, setScanNotification] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = React.useRef<Html5Qrcode | null>(null);

  // -------------------------
  // QUERIES
  // -------------------------
  // Pantry Items
  const { data: pantryItems = [], isLoading: isPantryLoading } = useQuery<PantryItem[]>({
    queryKey: ["pantry"],
    queryFn: () => recipeClient.pantry.list(),
    enabled: isOpen,
  });

  // Recipes (for Recipe Matcher)
  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: () => recipeClient.recipes.list(),
    enabled: isOpen,
  });

  // Grocery Items
  const { data: groceryItems = [], isLoading: isGroceryLoading } = useQuery<GroceryItem[]>({
    queryKey: ["grocery"],
    queryFn: () => recipeClient.grocery.list(),
    enabled: isOpen,
  });

  // Grocery Settings
  const { data: grocerySettings } = useQuery<GrocerySettings>({
    queryKey: ["grocerySettings"],
    queryFn: () => recipeClient.grocery.getSettings(),
    enabled: isOpen,
  });

  // Meal Plan (for Smart Shopping List generation)
  const { data: mealPlan } = useQuery<MealPlan>({
    queryKey: ["mealPlan"],
    queryFn: () => recipeClient.mealPlan.get(),
    enabled: isOpen,
  });

  // -------------------------
  // MUTATIONS
  // -------------------------
  // Pantry
  const createPantryMutation = useMutation({
    mutationFn: (item: Partial<PantryItem>) => recipeClient.pantry.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
      setNewPantryName("");
      setNewPantryQuantity("");
      setNewPantryStatus("In Stock");
      setIsAddingPantry(false);
    }
  });

  const updatePantryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PantryItem> }) => recipeClient.pantry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
    }
  });

  const deletePantryMutation = useMutation({
    mutationFn: (id: string) => recipeClient.pantry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
    }
  });

  // Grocery
  const createGrocMutation = useMutation({
    mutationFn: (item: Partial<GroceryItem>) => recipeClient.grocery.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery"] });
      setNewGrocName("");
      setNewGrocPrice("");
      setNewGrocQty("");
    }
  });

  const updateGrocMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GroceryItem> }) => recipeClient.grocery.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery"] });
    }
  });

  const deleteGrocMutation = useMutation({
    mutationFn: (id: string) => recipeClient.grocery.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery"] });
    }
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (settings: GrocerySettings) => recipeClient.grocery.saveSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocerySettings"] });
      setIsEditingSettings(false);
    }
  });

  // Initialize Settings Editing Form
  React.useEffect(() => {
    if (grocerySettings) {
      setSettingsDefaultStore(grocerySettings.defaultStore || "Whole Foods");
      setSettingsBudget(String(grocerySettings.budgetLimit || 100));
      if (!newGrocStore) {
        setNewGrocStore(grocerySettings.defaultStore || "Whole Foods");
      }
    }
  }, [grocerySettings]);

  // -------------------------
  // BEHAVIORS & ACTIONS
  // -------------------------
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch (e) {
      console.warn("AudioContext beep failed:", e);
    }
  };

  // Live camera scan behaviors
  const startCamera = async () => {
    setCameraError(null);
    setScannedProduct(null);
    setScanNotification(null);
    setIsScanning(true);
    setIsCameraActive(true);

    try {
      // Small delay to allow the DOM to render the new reader div
      await new Promise(resolve => setTimeout(resolve, 200));

      const elementId = "camera-reader";
      const container = document.getElementById(elementId);
      if (!container) {
        throw new Error("Scanner viewport container element not found.");
      }

      const scanner = new Html5Qrcode(elementId);
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const boxWidth = Math.min(width * 0.85, 280);
            const boxHeight = Math.min(height * 0.45, 140);
            return { width: boxWidth, height: boxHeight };
          },
        },
        async (decodedText) => {
          playBeep();
          setIsScanning(false);
          setIsCameraActive(false);

          try {
            await scanner.stop();
          } catch (stopErr) {
            console.warn("Error stopping scanner on success:", stopErr);
          }

          setScanNotification("UPC code detected! Identifying grocery product with AI...");

          try {
            const product = await recipeClient.upc.lookup(decodedText);
            setScannedProduct(product);
            setScanNotification(null);
            setQuantityConfirmItem({
              name: product.name,
              item_name: product.name,
              category: product.category,
              quantity: product.qty,
              price: product.price,
              brand: product.brand,
              upc: product.upc,
              upc_code: product.upc.startsWith("PLU-") ? null : product.upc,
              plu_code: product.plu_code || (product.upc.startsWith("PLU-") ? product.upc.replace("PLU-", "") : null),
              is_organic: product.is_organic,
            });
            setIsQuantityConfirmOpen(true);
          } catch (lookupErr: any) {
            setScanNotification(null);
            setCameraError(`UPC code "${decodedText}" found, but identification failed: ${lookupErr.message}`);
          }
        },
        (errorMessage) => {
          // Frame errors, standard for scanning in progress
        }
      );
    } catch (err: any) {
      console.error("Failed to start camera:", err);
      setCameraError(err.message || "Could not access back camera. Please allow camera permissions.");
      setIsScanning(false);
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    setIsScanning(false);
    setIsCameraActive(false);
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.warn("Error stopping camera:", err);
      }
      html5QrCodeRef.current = null;
    }
  };

  // Clean up running cameras when tab switches or modal closes
  React.useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(err => console.warn("Clean up camera stop failed:", err));
        }
        html5QrCodeRef.current = null;
      }
    };
  }, [activeTab, isOpen]);

  // Simulated scan trigger
  const handleTriggerMockScan = async (product: typeof MOCK_BARCODES[0]) => {
    setIsScanning(true);
    setScannedProduct(null);
    setScanNotification(null);
    setCameraError(null);

    await stopCamera();

    setTimeout(async () => {
      playBeep();
      setIsScanning(false);
      setScanNotification("Identifying grocery product with AI...");
      try {
        const result = await recipeClient.upc.lookup(product.upc);
        setScannedProduct(result);
        setScanNotification(null);
        setQuantityConfirmItem({
          name: result.name,
          item_name: result.name,
          category: result.category,
          quantity: result.qty,
          price: result.price,
          brand: result.brand,
          upc: result.upc,
          upc_code: result.upc.startsWith("PLU-") ? null : result.upc,
          plu_code: result.plu_code || (result.upc.startsWith("PLU-") ? result.upc.replace("PLU-", "") : null),
          is_organic: result.is_organic,
        });
        setIsQuantityConfirmOpen(true);
      } catch (err) {
        // Fallback
        setScannedProduct(product);
        setScanNotification(null);
        setQuantityConfirmItem({
          name: product.name,
          item_name: product.name,
          category: product.category,
          quantity: product.qty,
          price: product.price,
          brand: product.brand,
          upc: product.upc,
          upc_code: product.upc.startsWith("PLU-") ? null : product.upc,
          plu_code: null,
          is_organic: false,
        });
        setIsQuantityConfirmOpen(true);
      }
    }, 1100);
  };

  // Custom UPC, PLU, or Product Name typed lookup
  const handleManualUpcLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = manualUpcInput.trim();
    if (!query) return;

    setIsScanning(true);
    setScannedProduct(null);
    setScanNotification(null);
    setCameraError(null);

    await stopCamera();

    setTimeout(async () => {
      playBeep();
      setIsScanning(false);
      setScanNotification("Searching PLU cache, Open Food Facts & fallbacks...");
      try {
        const result = await recipeClient.upc.lookup(query);
        setScannedProduct(result);
        setScanNotification(null);
        setManualUpcInput("");
        setQuantityConfirmItem({
          name: result.name,
          item_name: result.name,
          category: result.category,
          quantity: result.qty,
          price: result.price,
          brand: result.brand,
          upc: result.upc,
          upc_code: result.upc.startsWith("PLU-") ? null : result.upc,
          plu_code: result.plu_code || (result.upc.startsWith("PLU-") ? result.upc.replace("PLU-", "") : null),
          is_organic: result.is_organic,
        });
        setIsQuantityConfirmOpen(true);
      } catch (err: any) {
        setScanNotification(null);
        setCameraError(`Lookup failed: ${err.message}`);
      }
    }, 400);
  };

  // Add scanned item directly to Pantry Inventory - intercepts with Quantity Confirmation Modal
  const handleScanToPantry = () => {
    if (!scannedProduct) return;
    setQuantityConfirmItem({
      name: scannedProduct.name,
      item_name: scannedProduct.name,
      category: scannedProduct.category,
      quantity: scannedProduct.qty,
      price: scannedProduct.price,
      brand: scannedProduct.brand,
      upc: scannedProduct.upc,
      upc_code: scannedProduct.upc.startsWith("PLU-") ? null : scannedProduct.upc,
      plu_code: scannedProduct.plu_code || (scannedProduct.upc.startsWith("PLU-") ? scannedProduct.upc.replace("PLU-", "") : null),
      is_organic: scannedProduct.is_organic,
    });
    setIsQuantityConfirmOpen(true);
  };

  // Add scanned item to Grocery Shopping List
  const handleScanToGrocery = () => {
    if (!scannedProduct) return;
    createGrocMutation.mutate({
      name: scannedProduct.name,
      category: scannedProduct.category,
      price: scannedProduct.price,
      quantity: scannedProduct.qty,
      checked: false,
      store: grocerySettings?.defaultStore || "Whole Foods"
    }, {
      onSuccess: () => {
        setScanNotification(`🛒 "${scannedProduct.name}" added to your Grocery Shopping List!`);
        setScannedProduct(null);
      }
    });
  };

  // Tab 1 handlers
  const handleAddPantryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPantryName.trim()) return;

    if (!isPremium && pantryItems.length >= 20) {
      if (confirm("Storage limit reached! Upgrade to Premium to track unlimited ingredients and unlock advanced AI features?")) {
        localStorage.setItem("kitchen_is_premium", "true");
        setIsPremium(true);
      } else {
        return;
      }
    }

    createPantryMutation.mutate({
      name: newPantryName.trim(),
      category: newPantryCategory,
      quantity: newPantryQuantity.trim() || undefined,
      status: newPantryStatus
    });
  };

  // Tab 2 handlers
  const handleAddGrocItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrocName.trim()) return;
    createGrocMutation.mutate({
      name: newGrocName.trim(),
      category: newGrocCategory,
      price: parseFloat(newGrocPrice) || 0,
      quantity: newGrocQty.trim() || "1 unit",
      checked: false,
      store: activeStoreName
    });
  };

  // Save Settings Form
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(settingsBudget) || 100;
    saveSettingsMutation.mutate({
      defaultStore: settingsDefaultStore,
      budgetLimit: limit
    });
  };

  // Generate Smart Shopping List from weekly meal plan
  const handleGenerateSmartList = async () => {
    if (!mealPlan) {
      alert("Meal Plan is loading or unavailable.");
      return;
    }
    if (recipes.length === 0) {
      alert("No recipes in your collection yet. Add some recipes before generating a shopping list!");
      return;
    }

    const scheduledRecipeIds = new Set<string>();
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    days.forEach(day => {
      const dayPlan = mealPlan[day];
      if (dayPlan) {
        if (dayPlan.breakfast && dayPlan.breakfast.trim()) scheduledRecipeIds.add(dayPlan.breakfast.trim());
        if (dayPlan.lunch && dayPlan.lunch.trim()) scheduledRecipeIds.add(dayPlan.lunch.trim());
        if (dayPlan.dinner && dayPlan.dinner.trim()) scheduledRecipeIds.add(dayPlan.dinner.trim());
      }
    });

    const scheduledRecipes = recipes.filter(r => scheduledRecipeIds.has(r.id));

    if (scheduledRecipes.length === 0) {
      alert("You don't have any recipes scheduled in your weekly Meal Planner! Please schedule some recipes first.");
      return;
    }

    setIsGeneratingSmartList(true);
    try {
      const consolidatedItems = await recipeClient.grocery.consolidateSmartList(scheduledRecipes);

      if (consolidatedItems.length === 0) {
        alert("Consolidation finished, but no ingredients were found in your scheduled recipes.");
        return;
      }

      const storeName = selectedStoreFilter === "All" ? (grocerySettings?.defaultStore || "Whole Foods") : selectedStoreFilter;
      for (const item of consolidatedItems) {
        await recipeClient.grocery.create({
          name: item.name,
          category: item.category,
          price: item.price,
          quantity: item.quantity,
          checked: false,
          store: storeName
        });
      }

      queryClient.invalidateQueries({ queryKey: ["grocery"] });
      alert(`✨ Smart AI Shopping Consolidation Complete! Added ${consolidatedItems.length} consolidated items from your planned recipes for the week to your "${storeName}" shopping list.`);
    } catch (err: any) {
      console.error("Smart Consolidation error:", err);
      alert("Failed to consolidate ingredients. Please check your network and try again.");
    } finally {
      setIsGeneratingSmartList(false);
    }
  };

  // Bulk operation: Transfer checked grocery items to pantry inventory
  const handleCheckoutAndStockPantry = () => {
    const checkedItems = groceryItems.filter(item => item.checked);
    if (checkedItems.length === 0) {
      alert("Please check some grocery items that you bought first!");
      return;
    }

    if (window.confirm(`Done shopping? Would you like to check out and automatically import ${checkedItems.length} purchased items into your Pantry Inventory?`)) {
      // Loop and create each
      checkedItems.forEach(item => {
        createPantryMutation.mutate({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          status: "In Stock"
        });
        // Delete from grocery
        deleteGrocMutation.mutate(item.id);
      });
      alert(`Successfully imported ${checkedItems.length} items into Pantry Stock and cleared them from grocery list.`);
    }
  };

  // Filter Pantry Items - 0-unit / Out of Stock items are hidden by default per core rules
  const getSmartFilteredPantryItems = () => {
    if (selectedSmartStatus === "Expiring Soon") {
      return pantryItems.filter(item => {
        if (!isPantryItemVisible(item)) return false;
        const isRefrigerated = getStorageState(item).label === "Fridge";
        const shelfLife = getSimulatedShelfLifeDays(item);
        return isRefrigerated && shelfLife < 2;
      });
    } else if (selectedSmartStatus === "Low Stock") {
      return pantryItems.filter(item => item.status === "Running Low" && isPantryItemVisible(item));
    } else if (selectedSmartStatus === "Need to Buy") {
      return pantryItems.filter(item => item.status === "Out of Stock" || !isPantryItemVisible(item));
    } else if (selectedSmartStatus === "Recently Added") {
      return [...pantryItems]
        .filter(item => isPantryItemVisible(item))
        .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime())
        .slice(0, 5);
    }
    // Default: Only visible items with quantity > 0
    return pantryItems.filter(item => isPantryItemVisible(item));
  };

  const smartFilteredPantryItems = getSmartFilteredPantryItems();

  const getCategoryFilteredPantryItems = (itemsList: PantryItem[]) => {
    if (selectedCategory === "All Items") {
      return itemsList;
    }
    return itemsList.filter(item => {
      const nameLower = item.name.toLowerCase();
      const catLower = item.category.toLowerCase();
      
      switch (selectedCategory) {
        case "Grains & Pasta":
          return item.category === "Grains & Baking" && (
            nameLower.includes("pasta") || nameLower.includes("rice") || 
            nameLower.includes("grain") || nameLower.includes("noodle") || 
            nameLower.includes("quinoa") || nameLower.includes("penne") || 
            nameLower.includes("fusilli")
          );
        case "Canned Goods":
          return item.category === "Pantry Staples" || catLower.includes("staple") || (
            nameLower.includes("can") || nameLower.includes("canned") || 
            nameLower.includes("tomato") || nameLower.includes("bean") || 
            nameLower.includes("soup") || nameLower.includes("corn")
          );
        case "Snacks & Treats":
          return item.category === "Other" || (
            nameLower.includes("snack") || nameLower.includes("treat") || 
            nameLower.includes("chip") || nameLower.includes("chocolate") || 
            nameLower.includes("cookie") || nameLower.includes("pretzel")
          );
        case "Spices & Herbs":
          return item.category === "Spices & Oils" && (
            nameLower.includes("spice") || nameLower.includes("herb") || 
            nameLower.includes("salt") || nameLower.includes("cinnamon") || 
            nameLower.includes("pepper") || nameLower.includes("powder") ||
            nameLower.includes("paprika") || nameLower.includes("turmeric")
          );
        case "Oils & Vinegars":
          return item.category === "Spices & Oils" && (
            nameLower.includes("oil") || nameLower.includes("vinegar") || 
            nameLower.includes("olive")
          );
        case "Baking Supply":
          return item.category === "Grains & Baking" && (
            nameLower.includes("baking") || nameLower.includes("flour") || 
            nameLower.includes("sugar") || nameLower.includes("yeast") || 
            nameLower.includes("soda") || nameLower.includes("vanilla") ||
            nameLower.includes("syrup")
          );
        case "Beverages":
          return item.category === "Other" || catLower.includes("beverage") || (
            nameLower.includes("beverage") || nameLower.includes("tea") || 
            nameLower.includes("coffee") || nameLower.includes("juice") || 
            nameLower.includes("milk") || nameLower.includes("drink") ||
            nameLower.includes("espresso") || nameLower.includes("yogurt")
          );
        default:
          return item.category === selectedCategory;
      }
    });
  };

  const categoryFilteredPantryItems = getCategoryFilteredPantryItems(smartFilteredPantryItems);

  const filteredPantryItems = categoryFilteredPantryItems.filter(item => {
    return item.name.toLowerCase().includes(pantrySearch.toLowerCase());
  });

  // Filter Grocery Items by Search & Selected Store Filter
  const currentStoreFilter = selectedStoreFilter === "All" 
    ? (grocerySettings?.defaultStore || "Whole Foods") 
    : selectedStoreFilter;

  const filteredGrocItems = groceryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(grocSearch.toLowerCase());
    // Filter by specific store
    const matchesStore = item.store === currentStoreFilter;
    return matchesSearch && matchesStore;
  });

  // Pricing stats for grocery items matching the store
  const activeStoreName = currentStoreFilter;
  const activeStoreBudget = tripBudgets[activeStoreName] !== undefined
    ? tripBudgets[activeStoreName]
    : (grocerySettings?.budgetLimit || 100);

  // Helper to check if item is taxable (with custom user overrides)
  const isItemTaxable = (item: GroceryItem) => {
    if (taxOverrides[item.id] !== undefined) {
      return taxOverrides[item.id];
    }
    // Default Canadian tax rules: Pantry Staples & Other are taxable snacks/processed goods.
    // Produce, Dairy, Proteins, Grains, Spices are tax-exempt basic food ingredients.
    return item.category === "Pantry Staples" || item.category === "Other";
  };

  // Active province tax rate
  const provinceRate = PROVINCIAL_TAX_RATES[selectedProvince] || PROVINCIAL_TAX_RATES.ON;
  const taxRateDecimal = provinceRate.gst + provinceRate.pst + provinceRate.hst;

  // Total of CHECKED items (spent so far)
  const checkedItemsInStore = groceryItems.filter(item => item.store === activeStoreName && item.checked);
  const spentPreTax = checkedItemsInStore.reduce((sum, item) => sum + (item.price || 0), 0);
  const spentExempt = checkedItemsInStore
    .filter(item => !isItemTaxable(item))
    .reduce((sum, item) => sum + (item.price || 0), 0);
  const spentTaxable = checkedItemsInStore
    .filter(item => isItemTaxable(item))
    .reduce((sum, item) => sum + (item.price || 0), 0);
  const spentTax = spentTaxable * taxRateDecimal;
  const spentWithTax = spentExempt + spentTaxable + spentTax;

  // Total of ALL items in that store (estimated list cost)
  const allItemsInStore = groceryItems.filter(item => item.store === activeStoreName);
  const estimatedPreTax = allItemsInStore.reduce((sum, item) => sum + (item.price || 0), 0);
  const estimatedExempt = allItemsInStore
    .filter(item => !isItemTaxable(item))
    .reduce((sum, item) => sum + (item.price || 0), 0);
  const estimatedTaxable = allItemsInStore
    .filter(item => isItemTaxable(item))
    .reduce((sum, item) => sum + (item.price || 0), 0);
  const estimatedTax = estimatedTaxable * taxRateDecimal;
  const estimatedWithTax = estimatedExempt + estimatedTaxable + estimatedTax;

  // Backward compatibility alias variables so other components do not break
  const spentSoFar = spentWithTax;
  const estimatedTotal = estimatedWithTax;

  const budgetPercent = activeStoreBudget > 0 
    ? Math.min(Math.round((spentWithTax / activeStoreBudget) * 100), 200)
    : 0;

  // Recipe Matcher calculation (matching pantry "In Stock" or "Running Low")
  const inStockNames = pantryItems
    .filter(i => i.status !== "Out of Stock")
    .map(i => i.name.toLowerCase().trim());

  const matchedRecipes = recipes.map(recipe => {
    let matchCount = 0;
    recipe.ingredients.forEach(ing => {
      const lowerIng = typeof ing === "string" ? ing.toLowerCase() : (ing.name || ing.raw || "").toLowerCase();
      const hasMatch = inStockNames.some(name => lowerIng.includes(name));
      if (hasMatch) matchCount++;
    });

    const percent = recipe.ingredients.length > 0 
      ? Math.round((matchCount / recipe.ingredients.length) * 100) 
      : 0;

    return {
      recipe,
      matchCount,
      totalCount: recipe.ingredients.length,
      percent
    };
  })
  .filter(m => m.matchCount > 0)
  .sort((a, b) => b.percent - a.percent)
  .slice(0, 4);

  if (!isOpen && !isPage) return null;

  const headerTabs = (
    <div className="border-b border-zinc-100 dark:border-zinc-850 pb-3 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          {activeTab !== "pantry" && (
            <button
              onClick={() => setActiveTab("pantry")}
              className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              ← Back
            </button>
          )}
          <div>
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white leading-tight">
              Curation Kitchen
            </h2>
            <div className="text-[10px] text-zinc-400 font-bold">
              {isPremium ? "💎 Premium Unlimited" : `Items: ${pantryItems.length} / 20`}
            </div>
          </div>
        </div>

        {/* Tab Row Toggles: Compact action tabs without the redundant 'Kitchen Pantry' button */}
        <div className="bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl flex border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab(activeTab === "grocery" ? "pantry" : "grocery")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "grocery"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            🛒 Grocery &amp; Budget
          </button>
          <button
            onClick={() => setActiveTab(activeTab === "upc" ? "pantry" : "upc")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "upc"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            📸 UPC Barcode Scan
          </button>
        </div>
      </div>
    </div>
  );



  const mainTabsContent = (
    <AnimatePresence mode="wait">
      {activeTab === "pantry" && (
        <motion.div 
          key="pantry"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden min-h-0 relative pb-16"
        >
                {/* Left: Stock Controller */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                  {/* Search and Filters */}
                  <div className="space-y-4 mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <Input
                        type="text"
                        placeholder="Search ingredients in stock..."
                        value={pantrySearch}
                        onChange={(e) => setPantrySearch(e.target.value)}
                        className="pl-9 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:ring-amber-500"
                      />
                    </div>

                    {/* SMART STATUS GRID (2x2 Surface Cards) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">
                          Smart Filters
                        </span>
                        {selectedSmartStatus && (
                          <button
                            type="button"
                            onClick={() => setSelectedSmartStatus(null)}
                            className="text-[10px] font-bold text-amber-600 dark:text-amber-500 hover:underline"
                          >
                            Reset Smart Filter
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {
                            id: "Expiring Soon",
                            label: "🔔 Expiring Soon",
                            count: pantryItems.filter(item => getStorageState(item).label === "Fridge" && getSimulatedShelfLifeDays(item) < 2).length,
                            color: "border-rose-100 dark:border-rose-900/30 bg-rose-50/40 dark:bg-rose-950/10 text-rose-700 dark:text-rose-400"
                          },
                          {
                            id: "Low Stock",
                            label: "📉 Low Stock",
                            count: pantryItems.filter(item => item.status === "Running Low").length,
                            color: "border-amber-100 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400"
                          },
                          {
                            id: "Need to Buy",
                            label: "🛒 Need to Buy",
                            count: pantryItems.filter(item => item.status === "Out of Stock").length,
                            color: "border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/40 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-400"
                          },
                          {
                            id: "Recently Added",
                            label: "✨ Recently Added",
                            count: Math.min(5, pantryItems.length),
                            color: "border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400"
                          }
                        ].map(btn => {
                          const isSelected = selectedSmartStatus === btn.id;
                          return (
                            <button
                              key={btn.id}
                              type="button"
                              onClick={() => setSelectedSmartStatus(selectedSmartStatus === btn.id ? null : btn.id as any)}
                              className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-amber-600 border-amber-600 text-white shadow-sm scale-[0.98]"
                                  : "bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                              }`}
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-black tracking-tight">{btn.label}</span>
                                <span className={`text-[9px] ${isSelected ? "text-amber-200" : "text-zinc-400 dark:text-zinc-500"}`}>
                                  {btn.id === "Recently Added" ? "Last 5 items" : `${btn.count} active`}
                                </span>
                              </div>
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                isSelected ? "bg-white text-amber-700" : btn.color
                              }`}>
                                {btn.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* GROCERY CATEGORY LIST (Middle Section) */}
                    <div className="space-y-1.5 border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">
                          Categories
                        </span>
                        {selectedCategory !== "All Items" && (
                          <button
                            type="button"
                            onClick={() => setSelectedCategory("All Items")}
                            className="text-[10px] font-bold text-amber-600 dark:text-amber-500 hover:underline"
                          >
                            All Categories
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: "All Items", label: "📦 All Items" },
                          { id: "Grains & Pasta", label: "🌾 Grains & Pasta" },
                          { id: "Canned Goods", label: "🥫 Canned Goods" },
                          { id: "Snacks & Treats", label: "🥨 Snacks & Treats" },
                          { id: "Spices & Herbs", label: "🧂 Spices & Herbs" },
                          { id: "Oils & Vinegars", label: "🫒 Oils & Vinegars" },
                          { id: "Baking Supply", label: "🍞 Baking Supply" },
                          { id: "Beverages", label: "☕ Beverages" }
                        ].map(cat => {
                          const isSelected = selectedCategory === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setSelectedCategory(cat.id)}
                              className={`py-1.5 px-2.5 text-left rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs font-black"
                                  : "bg-zinc-50/50 dark:bg-zinc-950/30 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
                              }`}
                            >
                              <span className="truncate">{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Stock List with custom rows */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    {isPantryLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mb-2" />
                        <p className="text-xs text-zinc-400">Accessing pantry inventory...</p>
                      </div>
                    ) : filteredPantryItems.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl">
                        <Tag className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                        <p className="text-zinc-500 font-bold text-sm dark:text-zinc-400">Pantry inventory is empty</p>
                        <p className="text-xs text-zinc-400 mt-1">Add items below or scan a barcode in UPC Sync!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredPantryItems.map(item => {
                          const storage = getStorageState(item);
                          const categoryIcon = getCategoryEmojiWeb(item.category, item.name);
                          return (
                            <div 
                              key={item.id}
                              className="flex items-center justify-between p-3 rounded-xl border border-zinc-150 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-850/50 transition-all bg-white dark:bg-zinc-900 shadow-xs"
                            >
                              <div className="min-w-0 flex-1 flex items-center gap-3">
                                {/* Circle container for category emoji */}
                                <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg shrink-0 relative">
                                  {categoryIcon}
                                  {/* Small absolute storage badge */}
                                  <span className="absolute -bottom-1 -right-1 text-xs">{storage.icon}</span>
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200 truncate">{item.name}</span>
                                    {item.quantity && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-850 text-zinc-500 font-bold">
                                        {item.quantity}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-zinc-400 flex items-center gap-1 font-semibold">
                                    <span>{item.category}</span>
                                    <span>•</span>
                                    <span>{storage.label}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* Custom Capsule Status badge with matching color dot */}
                                <div className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold transition-all border ${
                                  item.status === "In Stock"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/50"
                                    : item.status === "Running Low"
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200/50"
                                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200/50"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    item.status === "In Stock" ? "bg-emerald-500" : item.status === "Running Low" ? "bg-amber-500" : "bg-rose-500"
                                  }`} />
                                  <select
                                    value={item.status}
                                    onChange={(e) => updatePantryMutation.mutate({ id: item.id, data: { status: e.target.value as any } })}
                                    className="bg-transparent border-none outline-none pr-1 font-bold text-[10px] cursor-pointer appearance-none text-current"
                                  >
                                    <option value="In Stock" className="text-zinc-800 bg-white dark:bg-zinc-900">In Stock</option>
                                    <option value="Running Low" className="text-zinc-800 bg-white dark:bg-zinc-900">Running Low</option>
                                    <option value="Out of Stock" className="text-zinc-800 bg-white dark:bg-zinc-900">Out of Stock</option>
                                  </select>
                                </div>

                                <button
                                  onClick={() => deletePantryMutation.mutate(item.id)}
                                  className="text-zinc-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/25 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* OVERAGE PROTECTION GATING CARD */}
                        {!isPremium && pantryItems.length >= 20 && (
                          <div 
                            onClick={() => {
                              if (confirm("Unlock unlimited tracking? Upgrade to Premium now to experience seamless ingredient curation with no limits!")) {
                                localStorage.setItem("kitchen_is_premium", "true");
                                setIsPremium(true);
                              }
                            }}
                            className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mt-4 cursor-pointer hover:bg-amber-500/15 transition-all flex items-start gap-3.5"
                          >
                            <span className="text-2xl mt-0.5">💎</span>
                            <div>
                              <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                                Upgrade to Premium to track unlimited ingredients
                              </h4>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                You are currently utilizing the free tier which is limited to 20 ingredients. Tap here to upgrade for unlimited tracking and advanced AI features!
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Independent Floating Action Button (FAB) anchored bottom-right over inventory list */}
                  <div className="absolute bottom-4 right-4 z-30">
                    {!isAddingPantry && (
                      <Button
                        onClick={() => {
                          if (!isPremium && pantryItems.length >= 20) {
                            if (confirm("Storage limit reached! Upgrade to Premium to track unlimited ingredients and unlock advanced AI features?")) {
                              localStorage.setItem("kitchen_is_premium", "true");
                              setIsPremium(true);
                            }
                          } else {
                            setIsAddingPantry(true);
                          }
                        }}
                        className={`${
                          !isPremium && pantryItems.length >= 20
                            ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                            : "bg-amber-600 hover:bg-amber-700"
                        } text-white font-extrabold text-xs rounded-full shadow-lg flex items-center gap-1.5 py-4 px-5 cursor-pointer border border-amber-500`}
                      >
                        {!isPremium && pantryItems.length >= 20 ? (
                          <>
                            <span>💎</span> Upgrade to Add
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" /> Add Item
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Add form inside the flow if active */}
                  {isAddingPantry && (
                      <form onSubmit={handleAddPantryItem} className="space-y-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between pb-1">
                          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">New Pantry Item</span>
                          <button type="button" onClick={() => setIsAddingPantry(false)} className="text-xs text-zinc-400 hover:text-zinc-600">Cancel</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <Input
                              required
                              placeholder="e.g. Greek Yogurt, Cilantro"
                              value={newPantryName}
                              onChange={(e) => setNewPantryName(e.target.value)}
                              className="text-xs bg-white dark:bg-zinc-900 border-zinc-200"
                            />
                          </div>
                          <div>
                            <select
                              value={newPantryCategory}
                              onChange={(e) => setNewPantryCategory(e.target.value)}
                              className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-2 outline-none"
                            >
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <Input
                              placeholder="Qty (e.g. 2 tubs, 1 bunch)"
                              value={newPantryQuantity}
                              onChange={(e) => setNewPantryQuantity(e.target.value)}
                              className="text-xs bg-white dark:bg-zinc-900 border-zinc-200"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingPantry(false)} className="text-xs">Cancel</Button>
                          <Button type="submit" size="sm" className="bg-amber-600 text-white font-bold text-xs">Add Item</Button>
                        </div>
                      </form>
                    )}
                  </div>

                 {/* Right: Matches Sidebar */}
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-850 pt-4 md:pt-0 md:pl-5 flex flex-col overflow-hidden">
                  <div className="mb-4">
                    <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Compatible Recipes
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Cookable matches from your kitchen inventory stock.</p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3">
                    {matchedRecipes.length === 0 ? (
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl text-center">
                        <p className="text-xs text-zinc-400">No matches found. Populate ingredients like Eggs, Flour, Milk, Butter to trigger recipes!</p>
                      </div>
                    ) : (
                      matchedRecipes.map(({ recipe, matchCount, totalCount, percent }) => (
                        <div key={recipe.id} className="p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-150 dark:border-zinc-850 hover:bg-amber-500/5 transition-all">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 truncate">{recipe.title}</span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 whitespace-nowrap">
                              {percent}% Match
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-2">
                            <span>{matchCount} of {totalCount} ingredients available</span>
                            <a href={`/recipe/${recipe.id}`} onClick={onClose} className="text-amber-600 hover:underline flex items-center gap-0.5 font-bold">
                              View <Eye className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: GROCERY SHOPPING LIST & BUDGET SHOP */}
            {activeTab === "grocery" && (
              <motion.div 
                key="grocery"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden min-h-0"
              >
                {/* Left: Grocery Shopping Checklist */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                  
                  {/* Select Store & Quick Stats Bar */}
                  <div className="flex flex-col lg:flex-row gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-150 dark:border-zinc-850 mb-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">Active Shopping Store</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedStoreFilter === "All" ? (grocerySettings?.defaultStore || "Whole Foods") : selectedStoreFilter}
                            onChange={(e) => {
                              setSelectedStoreFilter(e.target.value);
                              setNewGrocStore(e.target.value);
                            }}
                            className="text-xs font-black bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-amber-500 outline-none w-full"
                          >
                            {STORES_LIST.map(st => <option key={st} value={st}>{st}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Tax District (Canada)</span>
                          <span className="text-[9px] text-zinc-400 italic">Auto-calculates CRA rates</span>
                        </div>
                        <select
                          value={selectedProvince}
                          onChange={(e) => setSelectedProvince(e.target.value)}
                          className="text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-amber-500 outline-none w-full"
                        >
                          {Object.entries(PROVINCIAL_TAX_RATES).map(([code, rate]) => (
                            <option key={code} value={code}>
                              {rate.name} ({code}) &bull; {rate.hst > 0 ? `${(rate.hst * 100).toFixed(0)}% HST` : `${((rate.gst + rate.pst) * 100).toFixed(2).replace(/\.00$/, '')}% GST/PST`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center justify-between sm:justify-start lg:border-l lg:border-zinc-200 dark:lg:border-zinc-800 lg:pl-4 min-w-[250px]">
                      <div>
                        <span className="text-[10px] font-black uppercase text-zinc-400 block">Spent (with Tax)</span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block">${spentWithTax.toFixed(2)}</span>
                        <span className="text-[9px] text-zinc-400 block font-semibold leading-none">Pre-tax: ${spentPreTax.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-zinc-400 block">List Total (with Tax)</span>
                        <span className="text-sm font-black text-zinc-700 dark:text-zinc-200 block">${estimatedWithTax.toFixed(2)}</span>
                        <span className="text-[9px] text-zinc-400 block font-semibold leading-none">Pre-tax: ${estimatedPreTax.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-zinc-400 block">Trip Budget Limit</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-zinc-400 font-extrabold text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={activeStoreBudget}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setTripBudgets(prev => ({
                                ...prev,
                                [activeStoreName]: val
                              }));
                            }}
                            className="w-16 text-sm font-black bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
                            title="Budget limit is customizable for each specific store trip"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Smart AI Shopping List Banner */}
                  <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-rose-500 text-white p-4.5 rounded-2xl shadow-sm mb-4 border border-amber-400/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-rose-400/25 rounded-full blur-xl -ml-6 -mb-6 pointer-events-none" />
                    
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
                          <h4 className="font-black text-[10px] uppercase tracking-wider text-amber-100">Smart AI Shopping list</h4>
                        </div>
                        <p className="text-sm font-black text-white leading-tight">Consolidate Weekly Meal Plan Ingredients</p>
                        <p className="text-[11px] text-amber-50 max-w-md font-medium leading-relaxed">
                          Automatically scans your weekly planned recipes and leverages Gemini to combine identical ingredients, convert quantities, and estimate store prices.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleGenerateSmartList}
                        disabled={isGeneratingSmartList}
                        className="bg-white hover:bg-zinc-100 text-amber-700 font-black text-xs h-9.5 px-4.5 rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isGeneratingSmartList ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Consolidating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" /> Generate Smart List
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Grocery List Headings & Search */}
                  <div className="space-y-3 mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <Input
                        type="text"
                        placeholder={`Search list for ${activeStoreName}...`}
                        value={grocSearch}
                        onChange={(e) => setGrocSearch(e.target.value)}
                        className="pl-9 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                      />
                    </div>
                  </div>

                  {/* Shopping List Items */}
                  <div className="flex-1 overflow-y-auto pr-1">
                    {isGroceryLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
                        <p className="text-xs text-zinc-400">Loading groceries...</p>
                      </div>
                    ) : filteredGrocItems.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl">
                        <Store className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                        <p className="text-zinc-500 font-extrabold text-xs">No items on list for {activeStoreName}</p>
                        <p className="text-[11px] text-zinc-400 mt-1">Use the quick add tool below to append grocery products.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {filteredGrocItems.map(item => {
                          const taxable = isItemTaxable(item);
                          const currentDefault = item.category === "Pantry Staples" || item.category === "Other";
                          return (
                            <div 
                              key={item.id}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                item.checked 
                                  ? "bg-zinc-50/70 border-zinc-150 dark:bg-zinc-950/20 dark:border-zinc-850 opacity-70"
                                  : "bg-white border-zinc-150 dark:bg-zinc-900 dark:border-zinc-800 hover:border-amber-500/40 shadow-xs"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <button
                                  onClick={() => updateGrocMutation.mutate({ id: item.id, data: { checked: !item.checked } })}
                                  className="text-amber-600 hover:text-amber-700 transition-colors shrink-0"
                                >
                                  {item.checked ? (
                                    <CheckSquare className="w-5 h-5 fill-amber-50" />
                                  ) : (
                                    <Square className="w-5 h-5" />
                                  )}
                                </button>
                                
                                <div className="min-w-0">
                                  <span className={`text-sm font-extrabold text-zinc-800 dark:text-zinc-200 block truncate ${item.checked ? "line-through text-zinc-400" : ""}`}>
                                    {item.name}
                                  </span>
                                  <div className="flex flex-wrap gap-2 items-center text-[10px] text-zinc-400 font-semibold uppercase mt-0.5">
                                    <span>{item.quantity}</span>
                                    <span>&bull;</span>
                                    <span>{item.category}</span>
                                    <span>&bull;</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTaxOverrides(prev => {
                                          const currentVal = prev[item.id] !== undefined ? prev[item.id] : currentDefault;
                                          return {
                                            ...prev,
                                            [item.id]: !currentVal
                                          };
                                        });
                                      }}
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold tracking-tight transition-all uppercase cursor-pointer hover:scale-105 active:scale-95 ${
                                        taxable
                                          ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200/50"
                                          : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200/50"
                                      }`}
                                      title="Toggle taxable status for this item"
                                    >
                                      {taxable ? `Taxable (${(taxRateDecimal * 100).toFixed(1).replace(/\.0$/, '')}%)` : "Tax-Exempt (Basic)"}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-zinc-900 dark:text-white">
                                  ${item.price.toFixed(2)}
                                </span>

                                <button
                                  onClick={() => deleteGrocMutation.mutate(item.id)}
                                  className="text-zinc-400 hover:text-rose-500 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/25"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add Grocery Item Quick Input */}
                  <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                    <form onSubmit={handleAddGrocItem} className="space-y-2 bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-850">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Quick Append to list</span>
                        <span className="text-[10px] text-zinc-400 font-semibold uppercase">Adding to: {activeStoreName}</span>
                      </div>
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-6">
                          <Input
                            required
                            placeholder="e.g. Grass-fed Ribeye"
                            value={newGrocName}
                            onChange={(e) => setNewGrocName(e.target.value)}
                            className="text-xs bg-white dark:bg-zinc-900 border-zinc-200"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Price (e.g. 14.99)"
                            value={newGrocPrice}
                            onChange={(e) => setNewGrocPrice(e.target.value)}
                            className="text-xs bg-white dark:bg-zinc-900 border-zinc-200"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            placeholder="Qty (e.g. 1lb)"
                            value={newGrocQty}
                            onChange={(e) => setNewGrocQty(e.target.value)}
                            className="text-xs bg-white dark:bg-zinc-900 border-zinc-200"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1">
                        <select
                          value={newGrocCategory}
                          onChange={(e) => setNewGrocCategory(e.target.value)}
                          className="text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 outline-none font-semibold"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <Button type="submit" size="sm" className="bg-amber-600 text-white text-xs font-bold px-4 h-8 shrink-0">
                          Add Item
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Right: Budget Meter & Checkout Sync Controls */}
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-150 dark:border-zinc-850 pt-4 md:pt-0 md:pl-5 flex flex-col justify-between overflow-y-auto max-h-[80vh] pr-1 scrollbar-thin">
                  
                  {/* Budget progress panel */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        Budget Tracker
                      </h3>
                      <button
                        onClick={() => setIsEditingSettings(!isEditingSettings)}
                        className="text-zinc-400 hover:text-zinc-600 transition-colors"
                        title="Configure Store & Budget settings"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Settings Form (Inline toggle) */}
                    <AnimatePresence>
                      {isEditingSettings && (
                        <motion.form 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          onSubmit={handleSaveSettings}
                          className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 overflow-hidden text-xs mb-3"
                        >
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Default Store</label>
                            <select
                              value={settingsDefaultStore}
                              onChange={(e) => setSettingsDefaultStore(e.target.value)}
                              className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1"
                            >
                              {STORES_LIST.map(st => <option key={st} value={st}>{st}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Budget Limit ($)</label>
                            <Input
                              type="number"
                              value={settingsBudget}
                              onChange={(e) => setSettingsBudget(e.target.value)}
                              className="text-xs bg-white h-7 py-0 border-zinc-200"
                            />
                          </div>
                          <div className="flex justify-end gap-1.5 pt-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingSettings(false)} className="h-6 text-[10px] px-2">Cancel</Button>
                            <Button type="submit" size="sm" className="bg-amber-600 text-white h-6 text-[10px] px-2 font-bold">Save</Button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>
                    <div className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 text-center relative overflow-hidden">
                      <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                        Shopping Progress for {activeStoreName}
                      </span>
                      
                      <div className="flex items-baseline justify-center gap-1.5 mt-2">
                        <span className="text-3xl font-black text-zinc-900 dark:text-white">
                          ${spentWithTax.toFixed(2)}
                        </span>
                        <span className="text-xs text-zinc-400">/ ${activeStoreBudget.toFixed(2)}</span>
                      </div>

                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full mt-4 overflow-hidden relative">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            spentWithTax > activeStoreBudget 
                              ? "bg-rose-500" 
                              : spentWithTax > activeStoreBudget * 0.85 
                              ? "bg-amber-500" 
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${budgetPercent}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center mt-2.5">
                        <span className="text-[10px] font-extrabold text-zinc-500 uppercase">
                          {budgetPercent}% used
                        </span>
                        {spentWithTax > activeStoreBudget ? (
                          <span className="text-[10px] font-black text-rose-600 animate-pulse uppercase flex items-center gap-0.5">
                            Budget Exceeded!
                          </span>
                        ) : spentWithTax > activeStoreBudget * 0.85 ? (
                          <span className="text-[10px] font-black text-amber-600 uppercase">
                            Approaching Limit
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-emerald-600 uppercase">
                            Within Budget
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Detailed Tax & Price Breakdown */}
                    <div className="p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-900/40 text-xs space-y-2">
                      <h4 className="font-extrabold text-[10px] uppercase text-zinc-400 tracking-wider">
                        Trip Receipt Estimate ({provinceRate.name})
                      </h4>
                      <div className="space-y-1.5 text-zinc-600 dark:text-zinc-300">
                        <div className="flex justify-between">
                          <span>Basic Foods (Tax-Exempt):</span>
                          <span className="font-semibold">${spentExempt.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Taxable Items:</span>
                          <span className="font-semibold">${spentTaxable.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-dashed border-zinc-100 dark:border-zinc-800 pt-1">
                          <span>Subtotal Pre-Tax:</span>
                          <span className="font-semibold">${spentPreTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-amber-600 dark:text-amber-400">
                          <span>Calculated Sales Tax:</span>
                          <span className="font-bold">+${spentTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-1.5 text-zinc-900 dark:text-white font-black text-sm">
                          <span>Grand Total:</span>
                          <span>${spentWithTax.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="text-[9px] text-zinc-400 italic mt-1 leading-normal border-t border-zinc-100 dark:border-zinc-800 pt-1">
                        &bull; {provinceRate.notes}
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 bg-zinc-50 dark:bg-zinc-950/30 p-3 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
                      💡 <strong>Smart Budget Calculator:</strong> Set your budget above, check items off your checklist as you put them in your real cart, and see your live spent total automatically calculate!
                    </p>

                    <StoreComparison
                      items={groceryItems}
                      selectedProvince={selectedProvince}
                      onSelectStore={(storeName) => {
                        setSelectedStoreFilter(storeName);
                        setNewGrocStore(storeName);
                      }}
                      activeStoreName={activeStoreName}
                    />
                  </div>

                  {/* checkout and sync button */}
                  <div className="mt-6 pt-4 border-t border-zinc-150 dark:border-zinc-850">
                    <Button
                      onClick={handleCheckoutAndStockPantry}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-5 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Import Bought to Pantry
                    </Button>
                    <p className="text-[10px] text-zinc-400 text-center mt-1.5 font-medium">
                      Imports checked items to kitchen stock &amp; cleans up list.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: UPC BARCODE SCANNER EMULATOR */}
            {activeTab === "upc" && (
              <motion.div 
                key="upc"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden min-h-0"
              >
                {/* Left: Holographic Laser UPC Scanner */}
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1">
                        <Camera className="w-4 h-4 text-amber-600" />
                        Laser Scanner Lens
                      </h3>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${isCameraActive ? "bg-emerald-500/10 text-emerald-600 animate-pulse" : "bg-zinc-500/10 text-zinc-500"}`}>
                        {isCameraActive ? "Camera Active" : "Camera Idle"}
                      </span>
                    </div>

                    {/* Laser Scanner Lens Viewport */}
                    <div className="relative w-full aspect-video bg-zinc-950 rounded-2xl border-4 border-zinc-800 flex flex-col items-center justify-center overflow-hidden shadow-inner">
                      {/* Real live camera reader element */}
                      <div 
                        id="camera-reader" 
                        className={`absolute inset-0 w-full h-full bg-black ${isCameraActive ? "block" : "hidden"}`} 
                      />

                      {/* Laser red horizontal line sweeping */}
                      <AnimatePresence>
                        {isScanning && (
                          <motion.div 
                            initial={{ top: "10%" }}
                            animate={{ top: "90%" }}
                            transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.8 }}
                            className="absolute left-0 right-0 h-1 bg-rose-500 shadow-[0_0_15px_#f43f5e] z-20 pointer-events-none"
                          />
                        )}
                      </AnimatePresence>

                      {/* Overlay scanning info or Camera buttons */}
                      {isCameraActive ? (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center z-30">
                          <Button 
                            onClick={stopCamera} 
                            className="bg-rose-650 hover:bg-rose-700 text-white font-bold text-xs shadow-md rounded-full px-5 h-8 flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" /> Stop Scanning
                          </Button>
                        </div>
                      ) : scannedProduct ? (
                        <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 z-10">
                          <Check className="w-10 h-10 text-emerald-400 bg-emerald-950/80 p-2 rounded-full mb-2 animate-bounce" />
                          <span className="text-[10px] tracking-wider uppercase font-bold text-emerald-300">UPC Detected successfully</span>
                          <span className="text-base font-black text-center mt-1">{scannedProduct.name}</span>
                          <span className="text-[11px] opacity-80 mt-0.5">{scannedProduct.brand} &bull; {scannedProduct.qty}</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-5 z-10 bg-zinc-950/60 gap-4">
                          {/* Scanner indicator tag */}
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 shadow-xs">
                            <Barcode className="w-4 h-4 text-amber-500 animate-pulse" />
                            <span className="text-[11px] font-bold text-zinc-300">Mobile Barcode Scanner</span>
                          </div>

                          {/* Camera Action button */}
                          <Button 
                            onClick={startCamera} 
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-lg rounded-full px-6 py-3.5 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
                          >
                            <Camera className="w-4 h-4 animate-pulse" /> Start Phone Camera Scan
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Camera Error Display */}
                    {cameraError && (
                      <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/45 text-rose-800 dark:text-rose-400 text-xs font-semibold flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-650" />
                        <div className="space-y-1">
                          <p className="font-extrabold text-xs">Camera Scanner Issue</p>
                          <p className="opacity-90 leading-relaxed text-[11px]">{cameraError}</p>
                        </div>
                      </div>
                    )}

                    {/* Manual typed input of UPC barcode, PLU Code, or Product Text Search */}
                    <form onSubmit={handleManualUpcLookup} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                          Manual Barcode, PLU Code, or Product Search
                        </span>
                        <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400">
                          Try 4011, 94068, or Barcode
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Type barcode, 4/5-digit PLU (e.g. 94068), or product name..."
                          value={manualUpcInput}
                          onChange={(e) => setManualUpcInput(e.target.value)}
                          className="text-xs bg-zinc-50 border-zinc-200"
                        />
                        <Button 
                          type="submit" 
                          disabled={isScanning}
                          className="bg-zinc-900 hover:bg-black text-white dark:bg-amber-600 dark:hover:bg-amber-700 text-xs px-4 shrink-0 font-bold cursor-pointer"
                        >
                          Look Up
                        </Button>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        Global fallback search: 4/5-digit PLU codes, Open Food Facts barcode lookup, or generic ingredient parser for damaged labels.
                      </p>
                    </form>
                  </div>

                  {/* Scanned result actions popup/actions */}
                  <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                    <AnimatePresence mode="wait">
                      {scannedProduct ? (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-emerald-500/30 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                                  Product Verified
                                </span>
                                {scannedProduct.is_organic && (
                                  <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-200 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                                    🌿 Certified Organic
                                  </span>
                                )}
                                {scannedProduct.plu_code && (
                                  <span className="text-[9px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                                    PLU {scannedProduct.plu_code}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 mt-1">{scannedProduct.name}</h4>
                              <p className="text-xs text-zinc-400 mt-0.5">
                                Category: {scannedProduct.category} &bull; Est. Price: ${scannedProduct.price.toFixed(2)} &bull; Brand: {scannedProduct.brand || "Fresh Standard"}
                              </p>
                            </div>
                            <span className="text-xs font-mono font-bold text-zinc-400 shrink-0">
                              {scannedProduct.plu_code ? `PLU-${scannedProduct.plu_code}` : scannedProduct.upc}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={handleScanToPantry}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                            >
                              Direct to Pantry Stock
                            </Button>
                            <Button
                              onClick={handleScanToGrocery}
                              variant="outline"
                              className="border-zinc-300 font-bold text-xs"
                            >
                              Add to Grocery List
                            </Button>
                          </div>
                        </motion.div>
                      ) : scanNotification ? (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 p-3.5 rounded-xl border border-emerald-200/50 text-xs font-semibold flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>{scanNotification}</span>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Right: Barcode strip cards list */}
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-850 pt-4 md:pt-0 md:pl-5 flex flex-col overflow-hidden">
                  <div className="mb-4">
                    <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1">
                      <Barcode className="w-4 h-4 text-amber-600" />
                      UPC Database Items
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Simulate barcodes on physical groceries in your kitchen cupboard.</p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {MOCK_BARCODES.map(item => (
                      <button
                        key={item.upc}
                        onClick={() => handleTriggerMockScan(item)}
                        disabled={isScanning}
                        className="w-full text-left p-3 rounded-xl border border-zinc-150 dark:border-zinc-850 hover:border-amber-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-850/50 flex flex-col justify-between transition-all group disabled:opacity-50"
                      >
                        <div className="flex justify-between items-start w-full gap-2 mb-1.5">
                          <div className="min-w-0">
                            <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 group-hover:text-amber-600 truncate block">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-semibold">{item.qty} &bull; Est. ${item.price.toFixed(2)}</span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-850 text-zinc-500 font-bold uppercase shrink-0">
                            {item.category}
                          </span>
                        </div>

                        {/* Visual Barcode pattern strip */}
                        <div className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded py-1 px-2 flex flex-col items-center gap-0.5">
                          <div className="flex items-center justify-between w-full h-5 px-1 opacity-75">
                            <div className="w-0.5 bg-black dark:bg-white h-full" />
                            <div className="w-1 bg-black dark:bg-white h-full" />
                            <div className="w-[1px] bg-black dark:bg-white h-full" />
                            <div className="w-0.5 bg-black dark:bg-white h-full" />
                            <div className="w-1.5 bg-black dark:bg-white h-full" />
                            <div className="w-0.5 bg-black dark:bg-white h-full" />
                            <div className="w-[1px] bg-black dark:bg-white h-full" />
                            <div className="w-2 bg-black dark:bg-white h-full" />
                            <div className="w-0.5 bg-black dark:bg-white h-full" />
                            <div className="w-1 bg-black dark:bg-white h-full" />
                            <div className="w-[1px] bg-black dark:bg-white h-full" />
                            <div className="w-0.5 bg-black dark:bg-white h-full" />
                          </div>
                          <span className="text-[9px] font-mono tracking-widest font-bold text-zinc-400">{item.upc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
  );

  if (isPage) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col" id="pantry-page-container">
        {/* Top Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
          <div className="max-w-5xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
            {/* Left: Home Button */}
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 cursor-pointer">
                <Home className="w-3.5 h-3.5 text-zinc-500" />
                <span>Home</span>
              </Button>
            </Link>

            {/* Center: Title */}
            <h1 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider">
              Pantry Hub
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

        <div className="max-w-5xl w-full mx-auto px-4 py-8 flex-grow flex flex-col">
          <div className="relative w-full rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-md border border-zinc-100 dark:border-zinc-800 flex flex-col flex-grow min-h-[75vh]" id="pantry-page-content">
            {headerTabs}
            {mainTabsContent}
          </div>
        </div>

        {/* Quantity Confirmation Stepper Modal */}
        <QuantityConfirmationModal
          isOpen={isQuantityConfirmOpen}
          onClose={() => setIsQuantityConfirmOpen(false)}
          resolvedItem={quantityConfirmItem}
          onSuccess={() => {
            setScannedProduct(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" id="pantry-modal-container">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col h-[90vh] overflow-hidden"
          id="pantry-modal"
        >
          {/* Close button */}
          {onClose && (
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {headerTabs}
          {mainTabsContent}
        </motion.div>
      </div>

      {/* Quantity Confirmation Stepper Modal */}
      <QuantityConfirmationModal
        isOpen={isQuantityConfirmOpen}
        onClose={() => setIsQuantityConfirmOpen(false)}
        resolvedItem={quantityConfirmItem}
        onSuccess={() => {
          setScannedProduct(null);
        }}
      />
    </div>
  );
}
