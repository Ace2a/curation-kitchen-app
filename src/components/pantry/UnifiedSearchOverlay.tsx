/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Html5Qrcode } from "html5-qrcode";
import { 
  Camera, CameraOff, Search, Loader2, X, Barcode, 
  Package, Sparkles, Scale, RefreshCw, AlertCircle, 
  ChevronRight, ArrowRight, CornerDownLeft, ShieldCheck
} from "lucide-react";
import { unifiedPantrySearch, UnifiedSearchResult } from "../../services/pantryService";
import { 
  QuantityConfirmationModal, 
  ResolvedPantryItem 
} from "./QuantityConfirmationModal";
import { PantryItem } from "../../types";
import { getProductEmoji } from "../../lib/pantryUtils";

export interface UnifiedSearchOverlayProps {
  isOpen?: boolean;
  onClose?: () => void;
  onItemAdded?: (item: PantryItem) => void;
  isModal?: boolean;
  className?: string;
}

/**
 * Standard Web Audio API helper to sound a crisp checkout-scanner beep
 * when a physical barcode is successfully acquired by the camera.
 */
function playScannerBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(920, ctx.currentTime);
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // Browsers might silence un-interacted audio contexts
  }
}

export function UnifiedSearchOverlay({
  isOpen = true,
  onClose,
  onItemAdded,
  isModal = true,
  className = "",
}: UnifiedSearchOverlayProps) {
  // Input & Debouncing State
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState<UnifiedSearchResult[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Active Resolved Item for Quantity Stepper Modal
  const [activeItem, setActiveItem] = useState<ResolvedPantryItem | null>(null);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const html5ScannerRef = useRef<Html5Qrcode | null>(null);
  const cameraContainerId = "unified-scanner-viewport";

  // Ref to track latest input to prevent stale barcode auto-triggers
  const latestQueryRef = useRef("");
  latestQueryRef.current = debouncedQuery;

  // --------------------------------------------------------------------------
  // 1. DEBOUNCING ENGINE (300ms)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // --------------------------------------------------------------------------
  // 2. SEARCH ENGINE INTEGRATION (via pantryService.ts dynamic router)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!debouncedQuery) {
      setCandidates([]);
      setIsDropdownOpen(false);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    let isMounted = true;
    setIsSearching(true);
    setSearchError(null);

    (async () => {
      try {
        const results = await unifiedPantrySearch(debouncedQuery);

        if (!isMounted) return;
        setIsSearching(false);

        if (results && results.length > 0) {
          setCandidates(results);
          setIsDropdownOpen(true);

          // Unique Resolution Rule:
          // If purely numeric barcode (8-14 digits) returns exactly 1 candidate,
          // automatically route to QuantityConfirmationModal stepper overlay.
          const isNumericBarcode = /^\d{8,14}$/.test(debouncedQuery);
          if (isNumericBarcode && results.length === 1) {
            handleSelectItem(results[0]);
          }
        } else {
          setCandidates([]);
          setIsDropdownOpen(false);
          setSearchError(`No product found for "${debouncedQuery}"`);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setIsSearching(false);
        setCandidates([]);
        setIsDropdownOpen(false);
        setSearchError(err.message || "Failed to search inventory.");
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  // --------------------------------------------------------------------------
  // 3. CAMERA SCANNER LIFECYCLE
  // --------------------------------------------------------------------------
  const startCamera = async () => {
    setCameraError(null);
    setIsStartingCamera(true);

    try {
      // Small tick to ensure container exists in DOM
      await new Promise((resolve) => setTimeout(resolve, 150));

      const container = document.getElementById(cameraContainerId);
      if (!container) {
        throw new Error("Camera viewport container element was not found in the DOM.");
      }

      // Stop any existing instance
      if (html5ScannerRef.current) {
        try {
          if (html5ScannerRef.current.isScanning) {
            await html5ScannerRef.current.stop();
          }
        } catch {
          // ignore
        }
      }

      const scanner = new Html5Qrcode(cameraContainerId);
      html5ScannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 12,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const boxWidth = Math.min(viewfinderWidth * 0.85, 300);
            const boxHeight = Math.min(minEdge * 0.48, 150);
            return { width: boxWidth, height: boxHeight };
          },
        },
        async (decodedText) => {
          playScannerBeep();
          await stopCamera();

          setInputValue(decodedText);
          setIsSearching(true);

          try {
            const results = await unifiedPantrySearch(decodedText);
            setIsSearching(false);
            if (results && results.length > 0) {
              handleSelectItem(results[0]);
            }
          } catch (lookupErr: any) {
            setIsSearching(false);
            setSearchError(`Scanned barcode "${decodedText}", but resolution failed.`);
          }
        },
        () => {
          // Frame error hook during live scanning
        }
      );

      setIsCameraActive(true);
      setIsStartingCamera(false);
    } catch (err: any) {
      console.warn("Camera start failed:", err);
      setIsStartingCamera(false);
      setIsCameraActive(false);
      setCameraError(
        err?.message ||
          "Could not initialize back camera. Please verify camera permissions or type barcode below."
      );
    }
  };

  const stopCamera = async () => {
    if (html5ScannerRef.current) {
      try {
        if (html5ScannerRef.current.isScanning) {
          await html5ScannerRef.current.stop();
        }
      } catch (err) {
        console.warn("Camera stop error:", err);
      }
      html5ScannerRef.current = null;
    }
    setIsCameraActive(false);
    setIsStartingCamera(false);
  };

  // Cleanup camera on unmount or when modal closes
  useEffect(() => {
    return () => {
      if (html5ScannerRef.current) {
        if (html5ScannerRef.current.isScanning) {
          html5ScannerRef.current.stop().catch(() => {});
        }
        html5ScannerRef.current = null;
      }
    };
  }, []);

  // --------------------------------------------------------------------------
  // 4. CANDIDATE SELECTION & MODAL ROUTING
  // --------------------------------------------------------------------------
  const handleSelectItem = (candidate: UnifiedSearchResult) => {
    setIsDropdownOpen(false);

    // Pass resolved item straight to the QuantityConfirmationModal stepper overlay
    setActiveItem({
      name: candidate.item_name,
      item_name: candidate.item_name,
      raw_name: candidate.raw_name,
      category: candidate.category,
      quantity: candidate.quantity,
      unit: candidate.unit,
      price: candidate.price,
      brand: candidate.brand,
      upc_code: candidate.upc_code,
      upc: candidate.upc_code,
      plu_code: candidate.plu_code,
      is_organic: candidate.is_organic,
      source: candidate.source,
      confidence: candidate.confidence,
    });
    setIsQuantityModalOpen(true);
  };

  const handleClearInput = () => {
    setInputValue("");
    setCandidates([]);
    setIsDropdownOpen(false);
    setSearchError(null);
  };

  // Content Block
  const content = (
    <div className="w-full flex flex-col space-y-4 text-stone-100 select-none">
      {/* ==================================================================== */}
      {/* 1. CAMERA SCANNER VIEWPORT ON TOP                                    */}
      {/* ==================================================================== */}
      <div className="relative rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 shadow-2xl flex flex-col">
        {/* Top Viewport Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-stone-900/90 border-b border-stone-800/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-amber-500/15 text-amber-400">
              <Barcode className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-stone-300">
              Optical Barcode Scanner
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isCameraActive ? (
              <button
                type="button"
                onClick={stopCamera}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-all cursor-pointer shadow-xs active:scale-98"
              >
                <CameraOff className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                disabled={isStartingCamera}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 min-h-[40px] rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-98"
              >
                {isStartingCamera ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Accessing...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Start Camera</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Viewport Frame Container */}
        <div className="relative w-full h-56 sm:h-64 bg-stone-950 flex items-center justify-center overflow-hidden">
          {/* html5-qrcode target container */}
          <div
            id={cameraContainerId}
            className={`w-full h-full ${isCameraActive ? "block" : "hidden"}`}
          />

          {/* Idle / Inactive Overlay with Reticle */}
          {!isCameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-gradient-to-b from-stone-900/50 via-stone-950 to-stone-950">
              <div className="relative p-3.5 rounded-2xl bg-stone-900 border border-stone-800 shadow-inner group">
                <Camera className="w-7 h-7 text-stone-500 group-hover:text-amber-400 transition-colors" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              </div>

              <div className="space-y-1 max-w-xs">
                <p className="text-xs font-bold text-stone-200">
                  Live Viewport Standby
                </p>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Tap &ldquo;Start Camera&rdquo; above to scan food packages, or type barcodes / produce codes below.
                </p>
              </div>

              {cameraError && (
                <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-[11px] flex items-center gap-2 max-w-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="text-left leading-tight">{cameraError}</span>
                </div>
              )}
            </div>
          )}

          {/* Active Scanning Reticle / Viewfinder Visual Guides */}
          {isCameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Outer semi-dark vignetting */}
              <div className="relative w-64 h-32 border border-amber-400/50 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                {/* Corner guide brackets */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-400 rounded-tl-sm" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-400 rounded-tr-sm" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-400 rounded-bl-sm" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-400 rounded-br-sm" />

                {/* Animated laser beam */}
                <motion.div
                  className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  animate={{ y: [0, 120, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />

                <span className="absolute bottom-1.5 inset-x-0 text-center text-[9px] font-mono font-bold tracking-widest uppercase text-amber-200/90 drop-shadow-sm">
                  Align Barcode Inside Box
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. SEARCH INPUT BAR DIRECTLY BENEATH CAMERA                          */}
      {/* ==================================================================== */}
      <div className="relative w-full">
        <div className="relative flex items-center">
          {/* Left search/barcode icon */}
          <div className="absolute left-3.5 pointer-events-none text-stone-400 flex items-center">
            {/^\d+$/.test(inputValue) ? (
              <Barcode className="w-4 h-4 text-amber-400" />
            ) : (
              <Search className="w-4 h-4 text-stone-400" />
            )}
          </div>

          {/* EXACT REQUIRED PLACEHOLDER */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => {
              if (candidates.length > 0) setIsDropdownOpen(true);
            }}
            placeholder="Can't scan? Enter barcode numbers or product name"
            className="w-full pl-10 pr-11 py-3 min-h-[48px] rounded-2xl bg-stone-950/90 border border-stone-800 text-stone-100 placeholder-stone-500 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500/60 shadow-lg transition-all selection:bg-amber-500/30"
          />

          {/* Right Spinner or Clear Button */}
          <div className="absolute right-1.5 flex items-center gap-1.5">
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin mr-2" />
            ) : inputValue ? (
              <button
                type="button"
                onClick={handleClearInput}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 transition-colors cursor-pointer"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Dynamic Route Indicator Tag */}
        <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] text-stone-400 font-mono">
          <span>
            {/^\d{8,14}$/.test(inputValue.trim()) ? (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Barcode className="w-3 h-3" /> Direct Numeric Barcode Route (8-14 Digits)
              </span>
            ) : /^(9)?\d{4}$/.test(inputValue.trim()) ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Scale className="w-3 h-3" /> PLU Produce Dictionary Route (4-5 Digits)
              </span>
            ) : inputValue.trim() ? (
              <span className="text-stone-400 flex items-center gap-1">
                <Search className="w-3 h-3" /> Global Text &amp; Fallback Matching Route
              </span>
            ) : (
              <span>Quick tests: Try 4011 (Bananas), 94068 (Organic Green Onions), or 041196910123</span>
            )}
          </span>
          <span className="hidden sm:inline text-stone-500">300ms live debounce</span>
        </div>

        {/* ================================================================== */}
        {/* 3. FLOATING RESULTS DROPDOWN VIEW DIRECTLY BENEATH INPUT           */}
        {/* ================================================================== */}
        <AnimatePresence>
          {isDropdownOpen && candidates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="absolute top-full left-0 right-0 z-40 mt-1.5 max-h-72 overflow-y-auto rounded-2xl bg-stone-900/95 border border-stone-800 shadow-2xl backdrop-blur-md divide-y divide-stone-800/80 no-scrollbar"
            >
              <div className="px-3.5 py-2 bg-stone-950/60 flex items-center justify-between text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800/60 sticky top-0 z-10">
                <span className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Resolved Candidates ({candidates.length})
                </span>
                <span className="text-stone-500">Tap to customize quantity</span>
              </div>

              {candidates.map((candidate, idx) => {
                // Visual Differentiation:
                // - Branded goods: Package icon (📦) or small badge
                // - Generic items / PLU produce: Leaf icon (🌿) or green badge
                const isProduceOrGeneric =
                  Boolean(candidate.plu_code) ||
                  candidate.category?.toLowerCase() === "produce" ||
                  candidate.is_organic ||
                  candidate.source === "generic_ingredient_fallback" ||
                  candidate.source === "plu_cache";

                const isBrandedGood =
                  Boolean(candidate.brand) ||
                  candidate.source === "open_food_facts_barcode" ||
                  (candidate.source === "open_food_facts_search" && !isProduceOrGeneric);

                const itemEmoji = getProductEmoji(candidate.category, candidate.item_name);

                return (
                  <button
                    key={`${candidate.item_name}-${idx}`}
                    type="button"
                    onClick={() => handleSelectItem(candidate)}
                    className="w-full px-4 py-3 min-h-[52px] text-left flex items-center justify-between gap-3 hover:bg-stone-800/70 active:bg-stone-800 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Product icon */}
                      <span className="text-xl p-2 rounded-xl bg-stone-950 border border-stone-800 shrink-0">
                        {itemEmoji}
                      </span>

                      <div className="min-w-0">
                        {/* Badges line */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          {isBrandedGood ? (
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              📦 {candidate.brand || "Branded Good"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              🌿 {candidate.is_organic ? "Certified Organic" : "Produce / Staple"}
                            </span>
                          )}

                          {candidate.plu_code && (
                            <span className="text-[9.5px] font-mono font-bold text-amber-300/90 bg-stone-950 px-1.5 py-0.5 rounded border border-stone-800">
                              PLU {candidate.plu_code}
                            </span>
                          )}

                          {candidate.upc_code && (
                            <span className="text-[9.5px] font-mono text-stone-400 bg-stone-950 px-1 py-0.5 rounded border border-stone-800">
                              UPC {candidate.upc_code}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-xs sm:text-sm font-bold text-stone-100 group-hover:text-amber-400 transition-colors truncate">
                          {candidate.item_name}
                        </h4>

                        <p className="text-[10.5px] text-stone-400 truncate mt-0.5">
                          {candidate.category} &bull; Default: {candidate.quantity} {candidate.unit}
                          {candidate.price ? ` &bull; ~$${candidate.price.toFixed(2)}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-stone-800 group-hover:bg-[#D95338] text-stone-300 group-hover:text-white transition-all flex items-center gap-1">
                        <span>Set Qty</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Error Notice */}
        {searchError && !isDropdownOpen && (
          <p className="text-[11px] text-rose-400 pt-1.5 px-1 font-semibold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{searchError}</span>
          </p>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 4. QUANTITY CONFIRMATION MODAL INTERCEPTOR                           */}
      {/* ==================================================================== */}
      <QuantityConfirmationModal
        isOpen={isQuantityModalOpen}
        onClose={() => {
          setIsQuantityModalOpen(false);
          setActiveItem(null);
        }}
        resolvedItem={activeItem}
        onSuccess={(savedItem) => {
          if (onItemAdded) {
            onItemAdded(savedItem);
          }
          setActiveItem(null);
          setIsQuantityModalOpen(false);
          handleClearInput();
        }}
      />
    </div>
  );

  // If used as a stand-alone embedded section:
  if (!isModal) {
    return (
      <div className={`w-full bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl ${className}`}>
        {content}
      </div>
    );
  }

  // If used as a full modal dialog overlay:
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Unified Pantry Search Overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) {
            stopCamera();
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`relative w-full max-w-xl bg-stone-900/95 border border-stone-800 rounded-3xl shadow-2xl p-5 sm:p-6 overflow-visible ${className}`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-stone-800/80">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-serif font-bold text-stone-100">
                  Unified Search &amp; Scanner Overlay
                </h3>
                <p className="text-[11px] text-stone-400">
                  Optical barcode acquisition &bull; 4/5-digit PLU &bull; Text Fallback Engine
                </p>
              </div>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
                aria-label="Close unified search overlay"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {content}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
export default UnifiedSearchOverlay;
