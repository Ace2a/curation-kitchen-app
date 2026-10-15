/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Crown, Zap, Loader2 } from "lucide-react";
import { useSubscriptionSync } from "../../hooks/useSubscriptionSync";

export interface ProStatusBadgeProps {
  onOpenUpgrade: () => void;
  className?: string;
}

export function ProStatusBadge({ onOpenUpgrade, className = "" }: ProStatusBadgeProps) {
  const { subscription, isLoading, isPremium, isPollingActive } = useSubscriptionSync("default_user");

  // Loading skeleton state
  if (isLoading && !subscription) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-500 dark:text-stone-400 backdrop-blur-md animate-pulse ${className}`}
      >
        <Crown className="w-3.5 h-3.5 text-zinc-400 dark:text-stone-500" />
        <span>Plan: ...</span>
      </div>
    );
  }

  // 1. PRO TIER STATE: Automatically hide the transactional upgrade button entirely; render premium golden container
  if (isPremium) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 dark:from-amber-500/25 dark:via-yellow-500/30 dark:to-amber-500/25 border border-amber-400/60 dark:border-amber-400/70 shadow-xs shadow-amber-500/10 backdrop-blur-md ${className}`}
        title="Pro Member: Unlimited recipes, pantry tracking, and AI meal planner unlocked."
      >
        <span className="relative flex items-center justify-center">
          <Crown className="w-4 h-4 text-amber-500 dark:text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.95)]" />
        </span>

        <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
          Plan: <span className="text-amber-600 dark:text-amber-300 font-black">Pro</span>
        </span>
      </div>
    );
  }

  // 2. FREE TIER STATE: Display 'Plan: Free' coupled with high-contrast gradient 'Upgrade to Pro' button (min-h-[44px])
  return (
    <div className={`inline-flex items-center gap-1.5 sm:gap-2 ${className}`}>
      {/* Plan: Free Label */}
      <span className="inline-flex items-center px-2.5 py-1.5 rounded-xl bg-zinc-100/90 dark:bg-black/50 border border-zinc-200/80 dark:border-white/15 text-xs font-bold text-zinc-700 dark:text-stone-300 backdrop-blur-md shadow-2xs whitespace-nowrap">
        Plan: <span className="ml-1 text-zinc-900 dark:text-white font-extrabold">Free</span>
      </span>

      {/* High-Contrast Gradient Action Button */}
      <button
        type="button"
        onClick={onOpenUpgrade}
        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-[#D95338] hover:from-amber-400 hover:to-[#c2462e] text-white text-xs font-black tracking-wide flex items-center justify-center gap-1.5 shadow-md hover:shadow-amber-500/25 active:scale-[0.98] transition-all cursor-pointer shrink-0"
        title="Upgrade to Pro for unlimited recipes, pantry items, and features."
      >
        {isPollingActive ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            <span>Verifying...</span>
          </>
        ) : (
          <>
            <Zap className="w-3.5 h-3.5 fill-white text-white animate-pulse" />
            <span>Upgrade to Pro</span>
          </>
        )}
      </button>
    </div>
  );
}

export default ProStatusBadge;
