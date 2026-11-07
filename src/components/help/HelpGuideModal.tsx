/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  HelpCircle, X, Sparkles, BookOpen, Download, 
  Smartphone, ExternalLink, ArrowRight, Check,
  ChevronDown, ChevronUp, Share2, Compass, ShieldCheck, ChefHat
} from "lucide-react";

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchWalkthrough: () => void;
}

export function HelpGuideModal({ isOpen, onClose, onLaunchWalkthrough }: HelpGuideModalProps) {
  const [activePlatformTab, setActivePlatformTab] = useState<"ios" | "android">("ios");
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (promptEvent) {
      try {
        setIsInstalling(true);
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") {
          setInstallSuccess(true);
          (window as any).deferredPrompt = null;
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // Switch to active tab to show manual instructions
      alert("To install, follow the browser steps below for your mobile operating system.");
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-guide-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-xl bg-[#FAF6EE] dark:bg-zinc-900 text-[#2C2A29] dark:text-zinc-100 rounded-3xl shadow-2xl border border-[#E7E2D8] dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* 1. TOP HEADER */}
          <div className="p-5 sm:p-6 pb-4 border-b border-[#E7E2D8] dark:border-zinc-800 bg-[#FAF6EE] dark:bg-zinc-900 sticky top-0 z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black tracking-widest text-[#D95338] uppercase bg-[#D95338]/10 dark:bg-[#D95338]/20 px-2 py-0.5 rounded-md border border-[#D95338]/20">
                  CURATION KITCHEN HELP & GUIDES
                </span>
                <span className="text-[10px] font-bold text-[#6E8B6B] dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Certified
                </span>
              </div>
              <h2 id="help-guide-title" className="text-xl sm:text-2xl font-black text-[#2C2A29] dark:text-white tracking-tight flex items-center gap-2">
                <Compass className="w-6 h-6 text-[#D95338]" />
                Help & User Resources
              </h2>
              <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5 font-medium">
                Workspace walkthroughs, offline manual downloads, and home screen installation.
              </p>
            </div>

            {/* Strict 44px close touch target */}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-2xl bg-white dark:bg-zinc-800 hover:bg-[#E7E2D8] dark:hover:bg-zinc-700 text-[#78716C] dark:text-zinc-300 border border-[#E7E2D8] dark:border-zinc-700 transition-colors flex items-center justify-center cursor-pointer shrink-0 ml-2 shadow-2xs"
              aria-label="Close Help Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. SCROLLABLE RESOURCE LIST */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
            
            {/* ITEM 1: APP WALKTHROUGH */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-850 border border-[#E7E2D8] dark:border-zinc-800 shadow-xs hover:border-[#D95338]/40 transition-all">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#D95338] to-orange-400 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-[#2C2A29] dark:text-white">
                      Interactive App Walkthrough
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FAF6EE] dark:bg-zinc-800 text-[#D95338] border border-[#E7E2D8] dark:border-zinc-700">
                      3-Step Setup
                    </span>
                  </div>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-1 leading-relaxed">
                    Personalize your nutritional baselines, select your cooking mastery goal, and configure which workspace modules (Pantry Tracker, Smart Grocery, Meal Planner) are active.
                  </p>
                  
                  {/* Strict 44px action touch target */}
                  <div className="mt-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onLaunchWalkthrough();
                      }}
                      className="min-h-[44px] px-4 py-2.5 bg-[#D95338] hover:bg-[#C4462B] active:scale-[0.98] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                      <span>Launch App Walkthrough</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ITEM 2: APP MANUAL & PDF ANALYSIS */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-850 border border-[#E7E2D8] dark:border-zinc-800 shadow-xs hover:border-[#6E8B6B]/40 transition-all">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#6E8B6B] to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-[#2C2A29] dark:text-white">
                      Download App Manual & System Specs
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FAF6EE] dark:bg-zinc-800 text-[#6E8B6B] border border-[#E7E2D8] dark:border-zinc-700">
                      PDF Document
                    </span>
                  </div>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-1 leading-relaxed">
                    View or download the complete 12-page comprehensive Curation Kitchen manual covering local-first caching, barcode scanning rules, unit conversions, and architectural diagrams.
                  </p>

                  <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                    {/* View in Browser */}
                    <a
                      href="/download.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FAF6EE] dark:bg-zinc-800 hover:bg-[#E7E2D8] dark:hover:bg-zinc-700 text-[#2C2A29] dark:text-zinc-200 border border-[#E7E2D8] dark:border-zinc-700 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 text-[#6E8B6B]" />
                      <span>Open Web Viewer</span>
                    </a>

                    {/* Direct Download PDF */}
                    <a
                      href="/api/download-overview-pdf"
                      download="Curation_Kitchen_System_Analysis.pdf"
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6E8B6B] hover:bg-[#5C755A] active:scale-[0.98] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                    >
                      <Download className="w-4 h-4 stroke-[2.5]" />
                      <span>Download PDF</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* ITEM 3: HOME SCREEN SETUP GUIDE */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-850 border border-[#E7E2D8] dark:border-zinc-800 shadow-xs hover:border-amber-400/50 transition-all">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-[#2C2A29] dark:text-white">
                      Home Screen Setup Guide (PWA)
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                      Mobile Ready
                    </span>
                  </div>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-1 leading-relaxed">
                    Install Curation Kitchen directly on your phone home screen for instant launches, fullscreen view, and seamless offline pantry access.
                  </p>

                  {/* Platform Selector Buttons (min-h-[44px]) */}
                  <div className="mt-3 grid grid-cols-2 gap-2 bg-[#FAF6EE] dark:bg-zinc-800 p-1.5 rounded-2xl border border-[#E7E2D8] dark:border-zinc-700">
                    <button
                      type="button"
                      onClick={() => setActivePlatformTab("ios")}
                      className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activePlatformTab === "ios"
                          ? "bg-white dark:bg-zinc-900 text-[#D95338] shadow-xs border border-[#E7E2D8] dark:border-zinc-700"
                          : "text-[#78716C] dark:text-zinc-400 hover:text-[#2C2A29]"
                      }`}
                    >
                      <span>🍎 Apple iOS (iPhone/iPad)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePlatformTab("android")}
                      className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activePlatformTab === "android"
                          ? "bg-white dark:bg-zinc-900 text-[#D95338] shadow-xs border border-[#E7E2D8] dark:border-zinc-700"
                          : "text-[#78716C] dark:text-zinc-400 hover:text-[#2C2A29]"
                      }`}
                    >
                      <span>🤖 Android (Chrome/Edge)</span>
                    </button>
                  </div>

                  {/* Step Instructions per Platform */}
                  <div className="mt-3 p-3.5 rounded-2xl bg-[#FAF6EE]/80 dark:bg-zinc-800/80 border border-[#E7E2D8] dark:border-zinc-700 text-xs text-[#2C2A29] dark:text-zinc-200 space-y-2">
                    {activePlatformTab === "ios" ? (
                      <ol className="space-y-2 list-decimal list-inside font-medium leading-relaxed">
                        <li>
                          Open this app in <strong className="font-bold text-[#D95338]">Safari</strong>.
                        </li>
                        <li>
                          Tap the <strong className="font-bold text-[#2C2A29] dark:text-white">Share</strong> icon <span className="inline-block px-1.5 py-0.5 rounded bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 font-mono text-[10px]">⎋ / [↑]</span> at the bottom of Safari.
                        </li>
                        <li>
                          Scroll down the share sheet and tap <strong className="font-bold text-[#2C2A29] dark:text-white">&ldquo;Add to Home Screen&rdquo;</strong>.
                        </li>
                        <li>
                          Tap <strong className="font-bold text-[#D95338]">&ldquo;Add&rdquo;</strong> in the top-right corner. Curation Kitchen will appear on your home screen with its custom icon!
                        </li>
                      </ol>
                    ) : (
                      <ol className="space-y-2 list-decimal list-inside font-medium leading-relaxed">
                        <li>
                          Open this app in <strong className="font-bold text-[#D95338]">Google Chrome</strong> or <strong className="font-bold text-[#D95338]">Edge</strong>.
                        </li>
                        <li>
                          Tap the <strong className="font-bold text-[#2C2A29] dark:text-white">three dots menu (⋮)</strong> in the top-right browser corner.
                        </li>
                        <li>
                          Select <strong className="font-bold text-[#2C2A29] dark:text-white">&ldquo;Install app&rdquo;</strong> or <strong className="font-bold text-[#2C2A29] dark:text-white">&ldquo;Add to Home screen&rdquo;</strong>.
                        </li>
                        <li>
                          Confirm by tapping <strong className="font-bold text-[#D95338]">&ldquo;Install&rdquo;</strong> to place it in your app launcher and home screen.
                        </li>
                      </ol>
                    )}

                    {/* Native Install Prompt Trigger if available */}
                    {(window as any).deferredPrompt && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleNativeInstall}
                          disabled={isInstalling || installSuccess}
                          className="w-full min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-amber-500 to-[#D95338] hover:from-amber-400 hover:to-[#c2462e] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {installSuccess ? (
                            <>
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Installed to Home Screen!</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              <span>One-Tap Install Prompt</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Cooking Voice Tip */}
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0">
                <ChefHat className="w-4 h-4" />
              </div>
              <p className="text-[11px] text-amber-900 dark:text-amber-200 font-medium leading-tight">
                <strong>Cooking Assistant Tip:</strong> While in interactive Cooking Mode inside any recipe, tap <span className="underline decoration-amber-500">&ldquo;View Voice Commands 💬&rdquo;</span> for hands-free step reading, skips, and timers!
              </p>
            </div>

          </div>

          {/* 3. BOTTOM FOOTER BAR */}
          <div className="p-4 sm:p-5 border-t border-[#E7E2D8] dark:border-zinc-800 bg-[#FAF6EE] dark:bg-zinc-900 flex items-center justify-between">
            <span className="text-[11px] text-[#78716C] dark:text-zinc-500 font-medium">
              Curation Kitchen v2.4 • Offline Ready
            </span>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-6 py-2.5 bg-[#FAF6EE] dark:bg-zinc-800 hover:bg-[#E7E2D8] dark:hover:bg-zinc-700 text-[#2C2A29] dark:text-zinc-200 border border-[#E7E2D8] dark:border-zinc-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-2xs"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export interface HelpGuideButtonProps {
  onClick: () => void;
  className?: string;
}

export function HelpGuideButton({ onClick, className = "" }: HelpGuideButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] min-w-[44px] px-2.5 py-1 rounded-xl bg-black/40 hover:bg-black/60 border border-white/15 hover:border-amber-400/50 backdrop-blur-md shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 text-white cursor-pointer shrink-0 ${className}`}
      title="Help & User Guides (Walkthrough, Manual & Home Screen Setup)"
      aria-label="Help & User Guides"
    >
      <HelpCircle className="w-3.5 h-3.5 text-amber-300 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]" />
      <span className="text-[9.5px] font-bold uppercase tracking-wider text-stone-200">
        Guides
      </span>
    </button>
  );
}
