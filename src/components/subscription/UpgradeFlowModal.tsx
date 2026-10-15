/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Crown, Sparkles, Check, X, ShieldCheck, 
  ArrowRight, Loader2, Zap, RefreshCw, ChefHat, CheckCircle2 
} from "lucide-react";
import { recipeClient } from "../../api/recipeClient";
import { useQueryClient } from "@tanstack/react-query";
import { broadcastSubscriptionUpdate } from "../../hooks/useSubscriptionSync";

interface UpgradeFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: "free" | "premium" | string;
  onUpgradeSuccess?: () => void;
}

export function UpgradeFlowModal({
  isOpen,
  onClose,
  currentTier = "free",
  onUpgradeSuccess,
}: UpgradeFlowModalProps) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAlreadyPro = currentTier === "premium";

  const handleStripeCheckout = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      sessionStorage.setItem("kitchen_pending_checkout", "true");
      window.dispatchEvent(new CustomEvent("checkout-session-started"));

      const session = await recipeClient.subscription.createCheckoutSession("default_user");
      if (session?.url) {
        // If in simulated dev mode, activate and redirect or refresh
        if (session.status === "simulated") {
          await recipeClient.subscription.setSimulatedTier("premium", "default_user");
          setSuccessMessage("Pro status activated! Unlimited culinary features unlocked.");
          queryClient.invalidateQueries({ queryKey: ["userSubscription"] });
          queryClient.invalidateQueries({ queryKey: ["recipes"] });
          queryClient.invalidateQueries({ queryKey: ["pantry"] });
          broadcastSubscriptionUpdate("premium");
          if (onUpgradeSuccess) onUpgradeSuccess();
          setTimeout(() => {
            onClose();
          }, 1400);
        } else {
          // Open Stripe checkout or redirect
          window.location.href = session.url;
        }
      }
    } catch (err: any) {
      console.error("Upgrade error:", err);
      sessionStorage.removeItem("kitchen_pending_checkout");
      setErrorMessage(err.message || "Failed to initialize checkout. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInstantActivate = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await recipeClient.subscription.setSimulatedTier("premium", "default_user");
      setSuccessMessage("Pro tier successfully unlocked! Enjoy unlimited recipes and pantry tracking.");
      queryClient.invalidateQueries({ queryKey: ["userSubscription"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
      broadcastSubscriptionUpdate("premium");
      if (onUpgradeSuccess) onUpgradeSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to activate Pro tier.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDowngradeToFree = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await recipeClient.subscription.setSimulatedTier("free", "default_user");
      setSuccessMessage("Downgraded to Free tier. 15-recipe and 20-pantry limits re-activated.");
      queryClient.invalidateQueries({ queryKey: ["userSubscription"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
      broadcastSubscriptionUpdate("free");
      if (onUpgradeSuccess) onUpgradeSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reset subscription tier.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-zinc-950 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing Top Header Banner */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-amber-950/80 via-zinc-900 to-black border-b border-amber-500/30 overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badge & Title */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-500/25 text-amber-300 border border-amber-400/50 shadow-xs">
              <Crown className="w-3 h-3 text-amber-300" />
              Curation Kitchen Pro
            </span>
            {isAlreadyPro && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Active Subscription
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-white drop-shadow-sm">
            {isAlreadyPro ? "You Are a Pro Member" : "Unlock Unlimited Culinary Power"}
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 leading-relaxed">
            {isAlreadyPro 
              ? "You have full, unrestricted access to unlimited recipes, infinite pantry inventory, and smart AI planning."
              : "Upgrade your kitchen workspace with unrestricted AI recipe parsing, full pantry tracking, and weekly planning."}
          </p>
        </div>

        {/* Modal Body: Feature Comparison Grid */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
              <X className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Feature Matrix */}
          <div className="space-y-2.5">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-amber-300/90">
              Pro Member Privileges
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                  <ChefHat className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Unlimited Recipe Library</h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Save unlimited recipes without the 15-recipe free cap.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Infinite Pantry Hub</h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Track all ingredients past the 20-item limit with spoilage alerts.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 text-cyan-400 mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">AI Recipe Parser</h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Instant extraction from web URLs, blogs, and camera scans.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shrink-0 text-orange-400 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Multi-Week Planning</h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Plan recurring weekly menus with auto-generated grocery lists.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Highlight Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-400/30 flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black font-serif text-amber-300">$4.99</span>
                <span className="text-xs text-stone-300 font-medium">/ month</span>
              </div>
              <p className="text-[10px] text-stone-400 mt-0.5">
                Renews monthly • Cancel anytime securely via Stripe
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <Check className="w-2.5 h-2.5" /> Secure Checkout
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-black/60 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-stone-400 hover:text-white text-xs font-semibold cursor-pointer transition-colors text-center order-2 sm:order-1"
          >
            Close
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            {isAlreadyPro ? (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleDowngradeToFree}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Switch back to Free tier to test limit gates"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Test Downgrade to Free</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleInstantActivate}
                  className="px-3 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                  title="Quick activate Pro tier for development testing"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-300" />}
                  <span className="hidden sm:inline">Instant</span> Unlock
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleStripeCheckout}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-[#D95338] hover:from-amber-400 hover:to-[#D95338] text-white text-xs font-black tracking-wide uppercase transition-all shadow-lg hover:shadow-amber-500/25 cursor-pointer flex items-center justify-center gap-2 transform active:scale-98"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Initiating Checkout...</span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4 text-yellow-200" />
                      <span>Upgrade to Pro ($4.99)</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
