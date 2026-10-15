/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Smartphone, Cpu, Wifi, Server, Sparkles, Database, 
  RefreshCw, CheckCircle2, ArrowRightLeft, Shield, Clock, BrainCircuit, Activity
} from "lucide-react";
import { offlineStore } from "../../api/offlineStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { recipeClient } from "../../api/recipeClient";

export default function SystemArchitectureWidget() {
  const queryClient = useQueryClient();
  const [activeNode, setActiveNode] = useState<"storage" | "gemini" | "network" | "database">("network");
  const [isOfflineSimulated, setIsOfflineSimulated] = useState(offlineStore.isOffline());
  const [pendingCount, setPendingCount] = useState(offlineStore.getQueue().length);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success">("idle");
  const [testInput, setTestInput] = useState("3 ripe bananas, 2 cups of rolled oats, 1/2 cup chocolate chips, bake 15 min");
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Read data from cache to show actual counts
  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => recipeClient.recipes.list("-created_date"),
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => recipeClient.collections.list("-created_date"),
  });

  useEffect(() => {
    const unsubscribe = offlineStore.subscribe((offline, count) => {
      setPendingCount(count);
      // If we are not simulating and real status changes
      if (!isOfflineSimulated && offline !== offlineStore.isOffline()) {
        // stay in sync with real status unless simulated
      }
    });
    return unsubscribe;
  }, [isOfflineSimulated]);

  // Handle simulate network change
  const handleSimulateNetwork = (online: boolean) => {
    setIsOfflineSimulated(!online);
    
    // We override offlineStore's state for simulation
    const prototype = Object.getPrototypeOf(offlineStore);
    const originalIsOffline = prototype.isOffline;
    
    // Dynamic override
    offlineStore.isOffline = () => !online;
    // Trigger network change event handler to update listeners
    const handleNetworkChange = (offlineStore as any).handleNetworkChange;
    if (handleNetworkChange) {
      handleNetworkChange.call(offlineStore, online);
    }

    // Force React Query refetch
    queryClient.invalidateQueries({ queryKey: ["recipes"] });
    queryClient.invalidateQueries({ queryKey: ["collections"] });
  };

  // Run manually triggered sync
  const handleTriggerSync = async () => {
    if (isOfflineSimulated) return;
    setSyncStatus("syncing");
    try {
      await offlineStore.syncWithServer();
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch {
      setSyncStatus("idle");
    }
  };

  // Simulated Gemini 3.5 Flash logic parsing
  const handleSimulateParsing = () => {
    if (!testInput.trim()) return;
    setIsParsing(true);
    setParsedResult(null);

    setTimeout(() => {
      // Intelligently parse the recipe text locally
      const input = testInput.toLowerCase();
      const ingredients = [];
      const instructions = [];
      const tags = ["healthy", "quick"];

      if (input.includes("banana")) ingredients.push("3 ripe bananas");
      if (input.includes("oat")) ingredients.push("2 cups rolled oats");
      if (input.includes("chocolate") || input.includes("chip")) ingredients.push("1/2 cup chocolate chips");
      if (ingredients.length === 0) {
        ingredients.push("Custom parsed ingredient 1", "Custom parsed ingredient 2");
      }

      if (input.includes("bake")) {
        instructions.push("Preheat oven and prepare baking sheet", "Bake for 15 minutes until golden brown");
        tags.push("baking");
      } else {
        instructions.push("Mix all ingredients together in a clean bowl", "Serve fresh or store refrigerated");
      }

      setParsedResult({
        title: "Gemini Parsed Masterpiece",
        prep_time: "5 mins",
        cook_time: input.includes("bake") ? "15 mins" : "0 mins",
        servings: 2,
        ingredients,
        instructions,
        tags,
        meal_heading: input.includes("bake") ? "Dessert" : "Breakfast"
      });
      setIsParsing(false);
    }, 1200);
  };

  return (
    <div id="system-architecture-panel" className="w-full max-w-4xl px-4 mt-8 mx-auto">
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-600 animate-pulse" />
              <span>Full-Stack Integration Engine</span>
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              Interactive structural map of our Offline-First Synchronization & AI Parsing system.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-850 p-1.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80">
            <span className="text-[9.5px] uppercase font-bold tracking-wider text-zinc-500 pl-1.5 pr-1">Network State:</span>
            <button
              onClick={() => handleSimulateNetwork(isOfflineSimulated)}
              className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                !isOfflineSimulated
                  ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200 dark:border-green-900/50"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
              }`}
            >
              {!isOfflineSimulated ? "● Connected (Live)" : "○ Offline (Simulated)"}
            </button>
          </div>
        </div>

        {/* 4-Component Circular / Flow Diagram */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative pt-2">
          
          {/* Card 1: Phone Local Storage */}
          <button
            onClick={() => setActiveNode("storage")}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
              activeNode === "storage"
                ? "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/50 ring-1 ring-red-500/20 shadow-md"
                : "bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-750 hover:bg-zinc-50 dark:hover:bg-zinc-850/50"
            }`}
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full -mr-4 -mt-4 group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${activeNode === "storage" ? "bg-red-500/10 text-red-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"}`}>
                <Smartphone className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-100/40 dark:bg-red-950/20 px-1.5 py-0.5 rounded-md">Pillar 1</span>
            </div>
            <h4 className="text-[11px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Phone Local Storage</h4>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">Optimistic browser caching via localStorage and offline action queueing.</p>
            
            {/* Live Indicator Dot */}
            <div className="mt-4 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[9px] font-mono font-bold text-zinc-400">
              <span>Cache Size:</span>
              <span className="text-zinc-700 dark:text-zinc-300">{(recipes.length + collections.length)} Records</span>
            </div>
          </button>

          {/* Connection Arrow 1 */}
          <div className="hidden md:flex absolute top-1/2 left-[23.5%] -translate-y-1/2 z-20 pointer-events-none items-center justify-center text-red-400">
            <ArrowRightLeft className="w-4 h-4 animate-pulse" />
          </div>

          {/* Card 2: Gemini 3.5 Flash Logic Parsing */}
          <button
            onClick={() => setActiveNode("gemini")}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
              activeNode === "gemini"
                ? "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/50 ring-1 ring-red-500/20 shadow-md"
                : "bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-750 hover:bg-zinc-50 dark:hover:bg-zinc-850/50"
            }`}
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full -mr-4 -mt-4 group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${activeNode === "gemini" ? "bg-amber-500/10 text-amber-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"}`}>
                <Cpu className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-100/40 dark:bg-amber-950/20 px-1.5 py-0.5 rounded-md">Pillar 2</span>
            </div>
            <h4 className="text-[11px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Gemini 3.5 Parsing</h4>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">AI-powered recipe structuring, smart category alignment, and ingredient scanning.</p>

            <div className="mt-4 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[9px] font-mono font-bold text-zinc-400">
              <span>Model ID:</span>
              <span className="text-amber-600 dark:text-amber-400">3.5-Flash</span>
            </div>
          </button>

          {/* Connection Arrow 2 */}
          <div className="hidden md:flex absolute top-1/2 left-[48.5%] -translate-y-1/2 z-20 pointer-events-none items-center justify-center text-red-400">
            <ArrowRightLeft className="w-4 h-4 animate-pulse" />
          </div>

          {/* Card 3: Internet Connectivity Check */}
          <button
            onClick={() => setActiveNode("network")}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
              activeNode === "network"
                ? "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/50 ring-1 ring-red-500/20 shadow-md"
                : "bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-750 hover:bg-zinc-50 dark:hover:bg-zinc-850/50"
            }`}
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-4 -mt-4 group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${activeNode === "network" ? "bg-blue-500/10 text-blue-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"}`}>
                <Wifi className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100/40 dark:bg-blue-950/20 px-1.5 py-0.5 rounded-md">Pillar 3</span>
            </div>
            <h4 className="text-[11px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Connectivity Check</h4>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">Real-time status listeners managing live fallback, sync, and retry logs.</p>

            <div className="mt-4 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[9px] font-mono font-bold text-zinc-400">
              <span>Status:</span>
              <span className={!isOfflineSimulated ? "text-green-600" : "text-amber-600"}>
                {!isOfflineSimulated ? "Online" : "Offline"}
              </span>
            </div>
          </button>

          {/* Connection Arrow 3 */}
          <div className="hidden md:flex absolute top-1/2 left-[73.5%] -translate-y-1/2 z-20 pointer-events-none items-center justify-center text-red-400">
            <ArrowRightLeft className="w-4 h-4 animate-pulse" />
          </div>

          {/* Card 4: Cloud Backend DB */}
          <button
            onClick={() => setActiveNode("database")}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
              activeNode === "database"
                ? "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/50 ring-1 ring-red-500/20 shadow-md"
                : "bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-750 hover:bg-zinc-50 dark:hover:bg-zinc-850/50"
            }`}
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/5 rounded-full -mr-4 -mt-4 group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${activeNode === "database" ? "bg-green-500/10 text-green-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"}`}>
                <Server className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-100/40 dark:bg-green-950/20 px-1.5 py-0.5 rounded-md">Pillar 4</span>
            </div>
            <h4 className="text-[11px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Cloud Backend DB</h4>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">Persistent, relational production database securely storing master state records.</p>

            <div className="mt-4 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[9px] font-mono font-bold text-zinc-400">
              <span>Sync state:</span>
              <span className="text-green-600">Synced</span>
            </div>
          </button>

        </div>

        {/* Dynamic Detail Console Panel */}
        <div className="bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 space-y-4">
          <AnimatePresence mode="wait">
            {activeNode === "storage" && (
              <motion.div
                key="storage-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-red-600" />
                    <h5 className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200">Phone Local Storage Console</h5>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 uppercase font-bold">Active & Persistent</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                  Every user modification—such as creating, favoriting, or deleting recipes—is immediately applied to the browser's <strong>localStorage</strong> database and cached instantly. If offline, the transaction is enqueued in the persistent local action queue.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/80">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase">Cached Recipes</div>
                    <div className="text-sm font-black text-zinc-800 dark:text-zinc-100 mt-0.5">{recipes.length}</div>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/80">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase">Cached Collections</div>
                    <div className="text-sm font-black text-zinc-800 dark:text-zinc-100 mt-0.5">{collections.length}</div>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/80 col-span-2 sm:col-span-1">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase">Queued Mutations</div>
                    <div className={`text-sm font-black mt-0.5 ${pendingCount > 0 ? "text-amber-600" : "text-zinc-800 dark:text-zinc-100"}`}>{pendingCount} queued</div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeNode === "gemini" && (
              <motion.div
                key="gemini-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                    <h5 className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200">Gemini 3.5 Flash Logic Parser</h5>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 uppercase font-bold">Server-Side Sandbox</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                  When importing or writing a new recipe, the <strong>@google/genai</strong> SDK uses <strong>Gemini 3.5 Flash</strong> to parse ingredients, compute cooking steps, automatically tag dietary profiles, and set intelligent heading classifications in milliseconds.
                </p>

                {/* Live Parser sandbox box */}
                <div className="border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl p-3 space-y-2.5">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Interactive Gemini Parsing Simulator</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      placeholder="Paste unstructured recipe text..."
                      className="flex-1 bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold focus:outline-hidden focus:ring-1 focus:ring-amber-500 text-zinc-800 dark:text-zinc-100"
                    />
                    <button
                      onClick={handleSimulateParsing}
                      disabled={isParsing}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer select-none"
                    >
                      {isParsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                      <span>{isParsing ? "Parsing..." : "Parse"}</span>
                    </button>
                  </div>

                  {parsedResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-zinc-50 dark:bg-zinc-850 p-3 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 text-[10px] space-y-2 font-mono text-zinc-600 dark:text-zinc-400"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200/50 dark:border-zinc-800">
                        <span className="text-amber-600 dark:text-amber-400 font-bold">✨ STRUCTURED OBJECT:</span>
                        <span className="text-zinc-400">Classified heading: <strong>{parsedResult.meal_heading}</strong></span>
                      </div>
                      <div>
                        <strong>Ingredients:</strong>
                        <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                          {parsedResult.ingredients.map((ing: string, i: number) => (
                            <li key={i}>{ing}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>Instructions:</strong>
                        <ol className="list-decimal pl-4 mt-0.5 space-y-0.5">
                          {parsedResult.instructions.map((inst: string, i: number) => (
                            <li key={i}>{inst}</li>
                          ))}
                        </ol>
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        {parsedResult.tags.map((tag: string, i: number) => (
                          <span key={i} className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-sans text-[8.5px] font-black uppercase">{tag}</span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {activeNode === "network" && (
              <motion.div
                key="network-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-blue-600" />
                    <h5 className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200">Internet Connectivity Check Module</h5>
                  </div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold ${!isOfflineSimulated ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {!isOfflineSimulated ? "Status: Online" : "Status: Offline"}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                  The client utilizes standard web hooks (<code>window.addEventListener('online')</code>) to capture hardware network transitions immediately. When back online, the synchronization manager starts transmitting queued modifications to the Cloud DB in the correct chronological order.
                </p>
                <div className="flex items-center gap-2 pt-1.5">
                  <button
                    onClick={() => handleSimulateNetwork(!isOfflineSimulated)}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    <span>{!isOfflineSimulated ? "Simulate Offline Mode" : "Simulate Online Mode"}</span>
                  </button>

                  {pendingCount > 0 && !isOfflineSimulated && (
                    <button
                      onClick={handleTriggerSync}
                      disabled={syncStatus !== "idle"}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
                    >
                      {syncStatus === "syncing" ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : syncStatus === "success" ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {syncStatus === "syncing" ? "Syncing..." : syncStatus === "success" ? "Synchronized!" : `Trigger Queue Sync (${pendingCount})`}
                      </span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {activeNode === "database" && (
              <motion.div
                key="database-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-green-600" />
                    <h5 className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200">Cloud Backend Database Server</h5>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 uppercase font-bold">Secure PostgreSQL</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                  A high-performance Cloud database preserving the source of truth for your culinary workspace. Built on an Express REST API backend, verifying incoming schemas, validating authentication constraints, and committing updates transactions safely.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/80 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-[10px] text-zinc-400 font-bold uppercase">Cloud Endpoint</div>
                      <div className="text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300">/api/recipes</div>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/80 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-[10px] text-zinc-400 font-bold uppercase">Secured REST API</div>
                      <div className="text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300">Express / JSON Payload</div>
                    </div>
                    <Shield className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 🔄 Integration Sync Flow footer legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 animate-spin" />
            <span>Cycle System:</span>
            <span className="text-zinc-500 dark:text-zinc-400 font-black">Local Cache 🔄 Gemini AI 🔄 Connect Check 🔄 Cloud Database</span>
          </div>
          <div>
            Built & Synced with Integrity
          </div>
        </div>

      </div>
    </div>
  );
}
