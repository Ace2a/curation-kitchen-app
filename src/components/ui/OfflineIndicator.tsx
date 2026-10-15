/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WifiOff, CloudLightning, CheckCircle2, RotateCw } from "lucide-react";
import { offlineStore } from "../../api/offlineStore";

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(offlineStore.isOffline());
  const [pendingCount, setPendingCount] = useState(offlineStore.getQueue().length);
  const [showSyncedSuccess, setShowSyncedSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let lastPendingCount = pendingCount;

    const unsubscribe = offlineStore.subscribe((offline, count) => {
      setIsOffline(offline);
      setPendingCount(count);

      // Transition check: if we were offline or had pending, and now we are online with 0 pending
      if (!offline && count === 0 && lastPendingCount > 0) {
        setIsSyncing(false);
        setShowSyncedSuccess(true);
        const timer = setTimeout(() => {
          setShowSyncedSuccess(false);
        }, 4000);
        return () => clearTimeout(timer);
      }

      if (!offline && count > 0) {
        setIsSyncing(true);
      } else {
        setIsSyncing(false);
      }

      lastPendingCount = count;
    });

    return unsubscribe;
  }, [pendingCount]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {/* Offline Banner */}
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="pointer-events-auto bg-amber-600 dark:bg-amber-700 text-white px-4 py-3 rounded-2xl shadow-xl border border-amber-500/20 flex items-center gap-3 max-w-sm"
          >
            <div className="p-2 bg-white/10 rounded-xl">
              <WifiOff className="w-5 h-5 text-amber-100" />
            </div>
            <div className="flex-1 space-y-0.5">
              <h4 className="text-xs font-black uppercase tracking-wider">Offline Mode</h4>
              <p className="text-[10px] text-amber-100 font-bold leading-normal">
                {pendingCount > 0 
                  ? `${pendingCount} change(s) saved locally. They will sync automatically when back online.`
                  : "You're disconnected, but can still view, add, or edit your recipes!"}
              </p>
            </div>
          </motion.div>
        )}

        {/* Syncing Banner */}
        {!isOffline && isSyncing && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="pointer-events-auto bg-zinc-900/95 dark:bg-zinc-800/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl border border-zinc-700/50 flex items-center gap-3 max-w-sm"
          >
            <div className="p-2 bg-white/10 rounded-xl">
              <RotateCw className="w-5 h-5 text-amber-500 animate-spin" />
            </div>
            <div className="flex-1 space-y-0.5">
              <h4 className="text-xs font-black uppercase tracking-wider">Syncing Cloud</h4>
              <p className="text-[10px] text-zinc-300 font-bold leading-normal">
                Uploading {pendingCount} offline modification(s)...
              </p>
            </div>
          </motion.div>
        )}

        {/* Sync Success Toast */}
        {!isOffline && showSyncedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="pointer-events-auto bg-green-600 text-white px-4 py-3 rounded-2xl shadow-xl border border-green-500/20 flex items-center gap-3 max-w-sm"
          >
            <div className="p-2 bg-white/10 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-green-100" />
            </div>
            <div className="flex-1 space-y-0.5">
              <h4 className="text-xs font-black uppercase tracking-wider">Sync Complete</h4>
              <p className="text-[10px] text-green-100 font-bold leading-normal">
                All local modifications synchronized securely with your cookbook!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
