/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Crown, Zap, Loader2 } from "lucide-react";
import { useSubscriptionSync } from "../../hooks/useSubscriptionSync";

export interface ProStatusBadgeProps {
  onOpenUpgrade?: () => void;
  className?: string;
  showUpgradeButton?: boolean;
}

export function ProStatusBadge({ onOpenUpgrade, className = "", showUpgradeButton = false }: ProStatusBadgeProps) {
  const { subscription, isLoading, isPremium, isPollingActive } = useSubscriptionSync("default_user");

  // Loading skeleton state
  if (isLoading && !subscription) {
    return (
      <div
        className={`inline-flex items-center min-h-[44px] gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-bold text-stone-400 backdrop-blur-md animate-pulse ${className}`}
      >
        <Crown className="w-3.5 h-3.5 text-stone-500" />
        <span>Plan: ...</span>
      </div>
    );
  }

  // 1. PRO TIER STATE: Automatically hide the transactional upgrade button entirely; render premium golden container
  if (isPremium) {
    return (
      <div
        className={`inline-flex items-center min-h-[44px] gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border border-amber-400/60 shadow-xs shadow-amber-500/10 backdrop-blur-md ${className}`}
        title="Pro Member: Unlimited recipes, pantry tracking, and AI meal planner unlocked."
      >
        <span className="relative flex items-center justify-center">
          <Crown className="w-3.5 h-3.5 text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.95)]" />
        </span>

        <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-200">
          Plan: <span className="text-amber-300 font-black">Pro</span>
        </span>
      </div>
    );
  }

  // 2. FREE TIER STATE: Display 'Plan: Free' cleanly in the header; button is moved to the promo container
  return (
    <div className={`inline-flex items-center min-h-[44px] gap-1.5 ${className}`}>
      {/* Plan: Free Label */}
      <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-black/40 border border-white/15 text-[9.5px] font-bold uppercase tracking-wider text-stone-300 backdrop-blur-md shadow-2xs whitespace-nowrap min-h-[44px]">
        Plan: <span className="ml-1 text-white font-extrabold">Free</span>
      </span>

      {showUpgradeButton && onOpenUpgrade && (
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
      )}
    </div>
  );
}

export default ProStatusBadge;
