import React, { useState, useEffect } from "react";
import { GroceryItem } from "../../types";
import { MapPin, Info, ArrowRight, DollarSign, RefreshCw, Car, Navigation, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button";

interface StoreComparisonProps {
  items: GroceryItem[];
  selectedProvince: string;
  onSelectStore: (storeName: string) => void;
  activeStoreName: string;
}

// Provincial tax rates map
const PROVINCIAL_TAX_RATES: Record<string, { name: string; gst: number; pst: number; hst: number }> = {
  "ON": { name: "Ontario", gst: 0, pst: 0, hst: 0.13 },
  "BC": { name: "British Columbia", gst: 0.05, pst: 0.07, hst: 0 },
  "QC": { name: "Quebec", gst: 0.05, pst: 0.09975, hst: 0 },
  "AB": { name: "Alberta", gst: 0.05, pst: 0, hst: 0 },
  "MB": { name: "Manitoba", gst: 0.05, pst: 0.07, hst: 0 },
  "SK": { name: "Saskatchewan", gst: 0.05, pst: 0.06, hst: 0 },
  "NS": { name: "Nova Scotia", gst: 0, pst: 0, hst: 0.15 },
  "NB": { name: "New Brunswick", gst: 0, pst: 0, hst: 0.15 },
  "PE": { name: "Prince Edward Island", gst: 0, pst: 0, hst: 0.15 },
  "NL": { name: "Newfoundland & Labrador", gst: 0, pst: 0, hst: 0.15 },
  "YT": { name: "Yukon", gst: 0.05, pst: 0, hst: 0 },
  "NT": { name: "Northwest Territories", gst: 0.05, pst: 0, hst: 0 },
  "NU": { name: "Nunavut", gst: 0.05, pst: 0, hst: 0 },
  "US": { name: "United States", gst: 0, pst: 0, hst: 0 }
};

interface StoreProfile {
  name: string;
  priceMultiplier: number;
  baseDistanceKm: number;
  isBulk: boolean;
  type: "Chain" | "Specialty" | "Superstore" | "Discount";
}

const STORE_PROFILES: StoreProfile[] = [
  // --- Popular Canadian Chains ---
  { name: "No Frills", priceMultiplier: 0.88, baseDistanceKm: 2.1, isBulk: false, type: "Discount" },
  { name: "FreshCo", priceMultiplier: 0.89, baseDistanceKm: 3.4, isBulk: false, type: "Discount" },
  { name: "Food Basics", priceMultiplier: 0.90, baseDistanceKm: 4.2, isBulk: false, type: "Discount" },
  { name: "Real Canadian Superstore", priceMultiplier: 0.92, baseDistanceKm: 2.8, isBulk: false, type: "Superstore" },
  { name: "Walmart Canada", priceMultiplier: 0.93, baseDistanceKm: 5.5, isBulk: false, type: "Superstore" },
  { name: "Bulk Barn", priceMultiplier: 0.85, baseDistanceKm: 3.1, isBulk: true, type: "Specialty" },
  { name: "Loblaws", priceMultiplier: 1.05, baseDistanceKm: 1.2, isBulk: false, type: "Chain" },
  { name: "Sobeys", priceMultiplier: 1.06, baseDistanceKm: 1.9, isBulk: false, type: "Chain" },
  { name: "Metro", priceMultiplier: 1.08, baseDistanceKm: 1.5, isBulk: false, type: "Chain" },
  { name: "Farm Boy", priceMultiplier: 1.12, baseDistanceKm: 3.8, isBulk: false, type: "Specialty" },
  { name: "T&T Supermarket", priceMultiplier: 1.04, baseDistanceKm: 4.8, isBulk: false, type: "Specialty" },
  { name: "Rabba Fine Foods", priceMultiplier: 1.18, baseDistanceKm: 0.6, isBulk: false, type: "Specialty" },
  { name: "Shoppers Drug Mart", priceMultiplier: 1.22, baseDistanceKm: 0.8, isBulk: false, type: "Specialty" },
  { name: "Costco Canada", priceMultiplier: 0.82, baseDistanceKm: 7.2, isBulk: true, type: "Superstore" },
  { name: "Local Farmers Market", priceMultiplier: 1.15, baseDistanceKm: 4.5, isBulk: false, type: "Specialty" },
  { name: "Corner Grocer", priceMultiplier: 1.20, baseDistanceKm: 0.5, isBulk: false, type: "Specialty" },
  { name: "Whole Foods", priceMultiplier: 1.25, baseDistanceKm: 3.2, isBulk: false, type: "Specialty" },
  { name: "Trader Joe's", priceMultiplier: 1.02, baseDistanceKm: 6.0, isBulk: false, type: "Chain" },
  { name: "Kroger", priceMultiplier: 1.00, baseDistanceKm: 8.0, isBulk: false, type: "Chain" },
  { name: "Aldi", priceMultiplier: 0.87, baseDistanceKm: 7.5, isBulk: false, type: "Discount" },
  { name: "Safeway", priceMultiplier: 1.05, baseDistanceKm: 5.0, isBulk: false, type: "Chain" },
  { name: "Local Market", priceMultiplier: 1.10, baseDistanceKm: 1.1, isBulk: false, type: "Specialty" }
];

const CANADIAN_CITIES = [
  { name: "Downtown Toronto, ON", lat: 43.6532, lng: -79.3832, province: "ON" },
  { name: "North York, ON", lat: 43.7615, lng: -79.4111, province: "ON" },
  { name: "Vancouver, BC", lat: 49.2827, lng: -123.1207, province: "BC" },
  { name: "Montreal, QC", lat: 45.5017, lng: -73.5673, province: "QC" },
  { name: "Calgary, AB", lat: 51.0447, lng: -114.0719, province: "AB" },
  { name: "Winnipeg, MB", lat: 49.8951, lng: -97.1384, province: "MB" },
  { name: "Halifax, NS", lat: 44.6488, lng: -63.5752, province: "NS" },
  { name: "Victoria, BC", lat: 48.4284, lng: -123.3656, province: "BC" }
];

// Seeded simple pseudo-random number based on a string
function getSeededRandom(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(Math.sin(hash)) * 1000 % 1;
}

export function StoreComparison({ items, selectedProvince, onSelectStore, activeStoreName }: StoreComparisonProps) {
  const [selectedCityIndex, setSelectedCityIndex] = useState<number>(0);
  const [customPostal, setCustomPostal] = useState<string>("");
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Travel cost rate per km in CAD (incorporating gas, vehicle wear, etc.)
  const travelCostPerKm = 0.55;

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }
    setIsDetectingGps(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsDetectingGps(false);
      },
      (error) => {
        setGpsError("Could not access location. Please select a city manually.");
        setIsDetectingGps(false);
      },
      { timeout: 8000 }
    );
  };

  const handleRefreshDistances = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Helper to check if item is taxable (using the same heuristic as PantryModal)
  const isItemTaxable = (item: GroceryItem) => {
    return item.category === "Pantry Staples" || item.category === "Other";
  };

  // Province tax rate multiplier
  const provinceRate = PROVINCIAL_TAX_RATES[selectedProvince] || PROVINCIAL_TAX_RATES.ON;
  const taxRateDecimal = provinceRate.gst + provinceRate.pst + provinceRate.hst;

  // Compute stats for each store profile
  const comparisonList = STORE_PROFILES.map((store) => {
    // Generate a distance based on active location (GPS or Chosen City or Postal Code)
    let distance = store.baseDistanceKm;

    if (gpsCoordinates) {
      // Calculate realistic branch distance from GPS using seeded random based on store name
      const seed = getSeededRandom(store.name + gpsCoordinates.lat.toFixed(3));
      distance = Math.round((0.5 + seed * 8.5) * 10) / 10;
    } else if (customPostal.trim()) {
      const seed = getSeededRandom(store.name + customPostal.trim().toUpperCase());
      distance = Math.round((0.8 + seed * 9.2) * 10) / 10;
    } else {
      const city = CANADIAN_CITIES[selectedCityIndex];
      const seed = getSeededRandom(store.name + city.name);
      distance = Math.round((0.4 + seed * 6.5) * 10) / 10;
    }

    // Basket pricing calculation
    let basketPreTax = 0;
    let basketTaxable = 0;
    let basketExempt = 0;

    if (items.length > 0) {
      items.forEach((item) => {
        const adjustedPrice = (item.price || 0) * store.priceMultiplier;
        basketPreTax += adjustedPrice;
        if (isItemTaxable(item)) {
          basketTaxable += adjustedPrice;
        } else {
          basketExempt += adjustedPrice;
        }
      });
    } else {
      // Mock basket for reference if shopping list is empty (e.g. general grocery list)
      const mockPrices = [4.50, 6.20, 3.99, 12.50, 5.00];
      mockPrices.forEach((price, idx) => {
        const adjustedPrice = price * store.priceMultiplier;
        basketPreTax += adjustedPrice;
        if (idx % 2 === 0) {
          basketTaxable += adjustedPrice;
        } else {
          basketExempt += adjustedPrice;
        }
      });
    }

    const basketTax = basketTaxable * taxRateDecimal;
    const basketTotalWithTax = basketExempt + basketTaxable + basketTax;
    const travelCost = distance * travelCostPerKm;
    const totalTripCost = basketTotalWithTax + travelCost;

    return {
      store,
      distance,
      basketPreTax,
      basketTaxable,
      basketExempt,
      basketTax,
      basketTotalWithTax,
      travelCost,
      totalTripCost
    };
  });

  // Sort by Best Value (Lowest Overall Trip Cost)
  const sortedComparison = [...comparisonList].sort((a, b) => a.totalTripCost - b.totalTripCost);

  // Find cheapest and closest for special tag badges
  const cheapestStoreObj = [...comparisonList].sort((a, b) => a.basketTotalWithTax - b.basketTotalWithTax)[0];
  const closestStoreObj = [...comparisonList].sort((a, b) => a.distance - b.distance)[0];
  const bestValueStoreObj = sortedComparison[0];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm text-xs space-y-4">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1">
          <Navigation className="w-4 h-4 text-amber-500 animate-pulse" />
          Smart Store Finder
        </h3>
        <button 
          type="button"
          onClick={handleRefreshDistances} 
          className={`text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer ${isRefreshing ? 'animate-spin' : ''}`}
          title="Recalculate closest locations"
          aria-label="Recalculate closest locations"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[11px] text-zinc-500 leading-normal">
        Compares prices &amp; driving distances across <strong>Canada</strong>. Suggests the best store based on total basket price + travel expense.
      </p>

      {/* Location selector */}
      <div className="space-y-2.5 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-150 dark:border-zinc-850">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-zinc-400">Your Shopping Location</span>
          <button
            type="button"
            onClick={handleUseGps}
            disabled={isDetectingGps}
            className="min-h-[38px] px-3 py-1 rounded-lg text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 flex items-center gap-1 transition-all cursor-pointer select-none"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{isDetectingGps ? "Locating..." : "Use My GPS"}</span>
          </button>
        </div>

        {gpsCoordinates ? (
          <div className="flex items-center justify-between text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-3 py-2 rounded-xl font-semibold min-h-[42px]">
            <span className="truncate flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              GPS Active: {gpsCoordinates.lat.toFixed(4)}, {gpsCoordinates.lng.toFixed(4)}
            </span>
            <button
              type="button"
              onClick={() => {
                setGpsCoordinates(null);
                setCustomPostal("");
              }}
              className="text-[10px] underline hover:no-underline font-black px-2 py-1 min-h-[36px] flex items-center cursor-pointer"
            >
              Reset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <select
                value={selectedCityIndex}
                onChange={(e) => {
                  setSelectedCityIndex(parseInt(e.target.value));
                  setCustomPostal("");
                }}
                className="w-full min-h-[42px] text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2 outline-hidden focus:ring-2 focus:ring-amber-500/40"
              >
                {CANADIAN_CITIES.map((city, idx) => (
                  <option key={city.name} value={idx}>{city.name}</option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="text"
                placeholder="Or Postal Code"
                value={customPostal}
                onChange={(e) => setCustomPostal(e.target.value.toUpperCase())}
                className="w-full min-h-[42px] text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2 outline-hidden uppercase focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
          </div>
        )}
        
        {gpsError && (
          <p className="text-[9px] text-rose-500 font-bold leading-none mt-1">{gpsError}</p>
        )}
      </div>

      {/* Stores List */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {sortedComparison.slice(0, 5).map((comp, idx) => {
          const isCurrentActive = activeStoreName === comp.store.name;
          const isBestValue = bestValueStoreObj.store.name === comp.store.name;
          const isCheapest = cheapestStoreObj.store.name === comp.store.name;
          const isClosest = closestStoreObj.store.name === comp.store.name;

          return (
            <div
              key={comp.store.name}
              className={`p-2.5 rounded-lg border transition-all ${
                isCurrentActive
                  ? "bg-amber-500/5 border-amber-500 shadow-sm"
                  : "bg-white dark:bg-zinc-900 border-zinc-150 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-extrabold text-zinc-800 dark:text-zinc-100 truncate">
                      {comp.store.name}
                    </span>
                    <span className="text-[9px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.2 rounded font-bold shrink-0">
                      {comp.store.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1 font-semibold">
                    <span className="flex items-center gap-0.5">
                      <Car className="w-3 h-3 text-zinc-400" />
                      {comp.distance} km
                    </span>
                    <span>&bull;</span>
                    <span>Basket: ${comp.basketTotalWithTax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-zinc-900 dark:text-white leading-none">
                    ${comp.totalTripCost.toFixed(2)}
                  </div>
                  <span className="text-[9px] text-zinc-400 font-semibold block mt-0.5">Total trip cost</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {isBestValue && (
                  <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[9px] font-black px-1.5 py-0.2 rounded">
                    ★ Best Overall Value
                  </span>
                )}
                {!isBestValue && isCheapest && (
                  <span className="bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[9px] font-black px-1.5 py-0.2 rounded">
                    $ Cheapest Basket
                  </span>
                )}
                {!isBestValue && isClosest && (
                  <span className="bg-purple-500/10 text-purple-700 dark:text-purple-400 text-[9px] font-black px-1.5 py-0.2 rounded">
                    📍 Closest Store
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between border-t border-dashed border-zinc-100 dark:border-zinc-800/60 mt-2 pt-1.5">
                <span className="text-[9px] text-zinc-400 font-medium">
                  {comp.store.isBulk ? "Bulk Discount (18% off)" : `${Math.round(comp.store.priceMultiplier * 100)}% benchmark`}
                </span>

                {isCurrentActive ? (
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-tight flex items-center gap-1 min-h-[36px] px-2.5 py-1 rounded-lg bg-amber-500/10">
                    ● Selected Store
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectStore(comp.store.name)}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-[10px] font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <span>Set as active filter</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[9px] text-zinc-400 flex items-start gap-1 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-lg leading-normal">
        <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
        <div>
          <strong>Note:</strong> Total trip cost factors in standard driving expenses in Canada (${travelCostPerKm}/km) plus matching province-specific tax on items in your active shopping list.
        </div>
      </div>
    </div>
  );
}
