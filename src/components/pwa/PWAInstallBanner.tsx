/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Share, PlusSquare, X, Smartphone, Sparkles, Check } from "lucide-react";
import { usePWAInstall } from "../../hooks/usePWAInstall";

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    const dismissedTime = localStorage.getItem("curation_kitchen_pwa_dismissed");
    if (dismissedTime) {
      const elapsed = Date.now() - parseInt(dismissedTime, 10);
      // Suppress for 24 hours if dismissed
      if (elapsed < 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("curation_kitchen_pwa_dismissed", Date.now().toString());
  };

  // If already installed as standalone PWA or user dismissed recently, don't show banner
  if (isInstalled || isDismissed) {
    return null;
  }

  // Only render on installable browser or iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <aside aria-label="Install Curation Kitchen" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-40 max-w-md w-auto">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          className="bg-[#FAF6EE]/95 dark:bg-zinc-900/95 backdrop-blur-md border border-[#D95338]/25 rounded-2xl p-3.5 sm:p-4 shadow-xl flex items-center justify-between gap-3 text-left overflow-hidden"
        >
          {/* App Icon Avatar */}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#EA580C] to-[#D95338] text-white flex items-center justify-center shrink-0 shadow-xs border border-white/20">
            <Smartphone className="w-5 h-5 text-[#FAF6EE]" />
          </div>

          {/* Value Pitch */}
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs sm:text-sm font-serif font-black text-zinc-900 dark:text-zinc-100">
                Install Curation Kitchen
              </h4>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-[#D95338]/15 text-[#D95338] border border-[#D95338]/30">
                App Shell
              </span>
            </div>
            <p className="text-[11px] text-stone-600 dark:text-stone-300 line-clamp-1">
              Add to home screen for fullscreen pantry scanning &amp; meal planning.
            </p>
          </div>

          {/* Action Triggers with Strict 44px Touch Target */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isInstallable && (
              <button
                type="button"
                onClick={install}
                className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl bg-[#D95338] hover:bg-[#b83e28] text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden xs:inline">Install</span>
              </button>
            )}

            {isIOS && (
              <button
                type="button"
                onClick={() => setShowIOSModal(true)}
                className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl bg-[#D95338] hover:bg-[#b83e28] text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95"
              >
                <Share className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Add</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Dismiss installation prompt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </aside>

      {/* iOS Installation Instruction Guide Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#FAF6EE] dark:bg-zinc-900 border border-[#D95338]/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E6DFC6] dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#D95338]/15 text-[#D95338] flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-serif font-bold text-zinc-900 dark:text-white">
                    Install on iPhone / iPad
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSModal(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  aria-label="Close iOS install modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-stone-700 dark:text-stone-300">
                <div className="p-3 rounded-2xl bg-white dark:bg-zinc-800/80 border border-[#E6DFC6] dark:border-zinc-700 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#D95338] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white">Tap the Safari Share Button</p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">Located on the bottom navigation bar of your Safari browser.</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-zinc-800/80 border border-[#E6DFC6] dark:border-zinc-700 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#D95338] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white">Select "Add to Home Screen"</p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">Scroll down the sharing sheet options and choose Add to Home Screen.</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#6E8B6B]/15 border border-[#6E8B6B]/30 flex items-start gap-3 text-[#4c6749] dark:text-emerald-300">
                  <Check className="w-5 h-5 shrink-0 mt-0.5 text-[#6E8B6B]" />
                  <p className="text-[11px] font-medium leading-relaxed">
                    Curation Kitchen will now launch as a clean, fullscreen mobile app with dedicated pantry storage.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full min-h-[44px] py-2.5 rounded-full bg-[#D95338] hover:bg-[#b83e28] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
