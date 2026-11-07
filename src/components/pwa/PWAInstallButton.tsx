/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Download, Share } from "lucide-react";
import { usePWAInstall } from "../../hooks/usePWAInstall";

interface PWAInstallButtonProps {
  className?: string;
}

export function PWAInstallButton({ className = "" }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSHint, setShowIOSHint] = useState(false);

  // If already installed or neither Chrome prompt nor iOS, suppress
  if (isInstalled || (!isInstallable && !isIOS)) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`min-h-[44px] px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-stone-200 hover:text-white text-[10.5px] font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 active:scale-95 ${className}`}
        aria-label="Install Curation Kitchen to home screen"
      >
        <Download className="w-3 h-3 text-amber-300 stroke-[2.2]" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setShowIOSHint((prev) => !prev)}
          className={`min-h-[44px] px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-stone-200 hover:text-white text-[10.5px] font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${className}`}
          aria-label="Add to home screen on iOS"
        >
          <Share className="w-3 h-3 text-amber-300" />
          <span>Add to Phone</span>
        </button>

        {showIOSHint && (
          <div className="absolute right-0 bottom-full mb-2 z-50 w-64 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 shadow-xl text-left text-xs text-stone-600 dark:text-stone-300">
            <p className="font-bold text-zinc-900 dark:text-white mb-1">Install on iOS:</p>
            <p className="text-[11px] leading-relaxed">
              Tap the <strong>Share</strong> button in Safari, then scroll down and tap <strong>Add to Home Screen</strong>.
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
