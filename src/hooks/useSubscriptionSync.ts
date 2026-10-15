/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { recipeClient } from "../api/recipeClient";

export interface SubscriptionData {
  user_id: string;
  subscription_tier: "free" | "premium" | string;
  is_premium: boolean;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  limits?: {
    recipes: { limit: number; current: number; unlimited: boolean; capped: boolean };
    pantry: { limit: number; current: number; unlimited: boolean; capped: boolean };
    meal_plans: { limit: number; unlimited: boolean };
  };
}

const BROADCAST_CHANNEL_NAME = "kitchen_subscription_channel";
const STORAGE_SYNC_KEY = "kitchen_subscription_last_sync";

/**
 * Dispatches a cross-tab and in-memory event alerting components that
 * the subscription tier has been updated.
 */
export function broadcastSubscriptionUpdate(updatedTier?: string) {
  if (typeof window === "undefined") return;

  // 1. In-memory custom event
  window.dispatchEvent(
    new CustomEvent("subscription-updated", {
      detail: { tier: updatedTier, timestamp: Date.now() },
    })
  );

  // 2. Cross-tab storage trigger
  try {
    localStorage.setItem(STORAGE_SYNC_KEY, Date.now().toString());
  } catch (e) {
    // Ignore storage quota errors
  }

  // 3. BroadcastChannel for modern browsers
  try {
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type: "SUBSCRIPTION_UPDATED", tier: updatedTier, timestamp: Date.now() });
      channel.close();
    }
  } catch (e) {
    // Ignore BroadcastChannel errors
  }
}

/**
 * Hook providing real-time subscription status, active checkout polling,
 * window focus sync, cross-tab sync, and celebratory upgrade notification.
 */
export function useSubscriptionSync(userId: string = "default_user") {
  const queryClient = useQueryClient();
  const [isPollingActive, setIsPollingActive] = useState(false);
  const [showUpgradeCelebration, setShowUpgradeCelebration] = useState(false);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingAttemptsRef = useRef(0);

  // TanStack Query for subscription data
  const { data: subscription, isLoading, refetch } = useQuery<SubscriptionData>({
    queryKey: ["userSubscription"],
    queryFn: () => recipeClient.subscription.getStatus(userId),
    refetchInterval: isPollingActive ? 1200 : 15000, // High-frequency polling during checkout
    staleTime: 3000,
  });

  const isPremium = subscription?.is_premium === true || subscription?.subscription_tier === "premium";

  // Stop polling helper
  const stopPolling = useCallback(() => {
    setIsPollingActive(false);
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    pollingAttemptsRef.current = 0;
    sessionStorage.removeItem("kitchen_pending_checkout");
  }, []);

  // Invalidate all related caches and notify all listeners
  const invalidateAndSyncAll = useCallback(
    (tier?: string) => {
      queryClient.invalidateQueries({ queryKey: ["userSubscription"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
      broadcastSubscriptionUpdate(tier);
    },
    [queryClient]
  );

  // Active high-frequency polling loop
  const startCheckoutPolling = useCallback(
    (maxAttempts = 20, intervalMs = 1200) => {
      setIsPollingActive(true);
      pollingAttemptsRef.current = 0;

      const executePoll = async () => {
        pollingAttemptsRef.current += 1;
        try {
          const freshStatus = await recipeClient.subscription.getStatus(userId);
          const nowPremium = freshStatus?.is_premium === true || freshStatus?.subscription_tier === "premium";

          if (nowPremium) {
            // Success! Immediately update query cache
            queryClient.setQueryData(["userSubscription"], freshStatus);
            invalidateAndSyncAll("premium");
            setShowUpgradeCelebration(true);
            stopPolling();
            return;
          }

          // Continue polling if under max attempts
          if (pollingAttemptsRef.current < maxAttempts) {
            pollingTimerRef.current = setTimeout(executePoll, intervalMs);
          } else {
            // Timed out, revert to standard interval
            stopPolling();
          }
        } catch (err) {
          console.warn("[Subscription Poller] Check error, will retry:", err);
          if (pollingAttemptsRef.current < maxAttempts) {
            pollingTimerRef.current = setTimeout(executePoll, intervalMs);
          } else {
            stopPolling();
          }
        }
      };

      // Run initial check immediately
      executePoll();
    },
    [userId, queryClient, invalidateAndSyncAll, stopPolling]
  );

  // 1. Detect checkout redirect parameters on mount without page reload
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment_status");
    const sessionId = params.get("session_id");
    const simulateTier = params.get("simulate_tier");
    const hasPendingCheckout = sessionStorage.getItem("kitchen_pending_checkout") === "true";

    const isSuccessfulCheckout =
      paymentStatus === "success" ||
      paymentStatus === "simulated_success" ||
      simulateTier === "premium" ||
      Boolean(sessionId);

    if (isSuccessfulCheckout || hasPendingCheckout) {
      // If simulated or success URL flag present, ensure backend is triggered
      if (paymentStatus === "success" || simulateTier === "premium" || paymentStatus === "simulated_success") {
        recipeClient.subscription.setSimulatedTier("premium", userId).then(() => {
          invalidateAndSyncAll("premium");
        });
      }

      // Start high-frequency polling until the status flips to premium
      startCheckoutPolling(18, 1000);

      // Clean URL params seamlessly without page refresh
      if (paymentStatus || sessionId || simulateTier) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [userId, startCheckoutPolling, invalidateAndSyncAll]);

  // 2. Window Focus & Visibility Change Listener
  // When user returns from a Stripe Checkout tab or popup window, immediately check status!
  useEffect(() => {
    const handleRecheck = () => {
      refetch().then((result) => {
        if (result.data?.is_premium) {
          invalidateAndSyncAll("premium");
        }
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleRecheck();
      }
    };

    window.addEventListener("focus", handleRecheck);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleRecheck);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refetch, invalidateAndSyncAll]);

  // 3. Cross-Tab Storage Listener
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_SYNC_KEY || e.key === "kitchen_is_premium") {
        refetch();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [refetch]);

  // 4. BroadcastChannel Listener
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === "SUBSCRIPTION_UPDATED") {
          refetch();
        }
      };
    } catch (e) {
      // Channel creation error
    }

    return () => {
      if (channel) {
        channel.close();
      }
    };
  }, [refetch]);

  // 5. In-Memory Custom Event Listener
  useEffect(() => {
    const handleCustomUpdate = () => {
      refetch();
    };

    window.addEventListener("subscription-updated", handleCustomUpdate);
    window.addEventListener("checkout-session-started", () => {
      startCheckoutPolling(25, 1000);
    });

    return () => {
      window.removeEventListener("subscription-updated", handleCustomUpdate);
      window.removeEventListener("checkout-session-started", () => {});
    };
  }, [refetch, startCheckoutPolling]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, []);

  return {
    subscription,
    isLoading,
    isPremium,
    isPollingActive,
    showUpgradeCelebration,
    dismissCelebration: () => setShowUpgradeCelebration(false),
    refetch,
    startCheckoutPolling,
    stopPolling,
    invalidateAndSyncAll,
  };
}
