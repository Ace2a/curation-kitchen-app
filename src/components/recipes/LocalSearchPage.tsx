/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Database, Wifi, Home } from "lucide-react";
import { recipeClient } from "../../api/recipeClient";
import { offlineStore } from "../../api/offlineStore";
import LocalFirstSearch from "./LocalFirstSearch";
import { Button } from "../ui/button";
import { KitchenLogo } from "../ui/KitchenLogo";

export default function LocalSearchPage() {
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(offlineStore.isOffline());

  useEffect(() => {
    const unsubscribe = offlineStore.subscribe((offline) => {
      setIsOffline(offline);
    });
    return unsubscribe;
  }, []);

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => recipeClient.recipes.list("-created_date"),
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => recipeClient.collections.list("-created_date"),
  });

  return (
    <div 
      className="min-h-screen text-zinc-900 flex flex-col font-sans selection:bg-red-200 relative bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: `url('https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1920&q=80')` }}
    >
      {/* Dark overlay for rich, high-contrast readibility */}
      <div className="absolute inset-0 bg-black/45 z-0" />

      <div className="relative z-10 flex flex-col min-h-screen justify-between">
        {/* Navigation Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-red-600 shadow-sm py-3 flex items-center">
          <div className="max-w-4xl w-full mx-auto px-4 flex items-center justify-between">
            {/* Left: Home Button */}
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 cursor-pointer bg-white text-zinc-800">
                <Home className="w-3.5 h-3.5 text-zinc-500" />
                <span>Home</span>
              </Button>
            </Link>

            {/* Center: Title */}
            <h2 className="text-sm font-black text-red-600 uppercase tracking-widest flex items-center gap-1">
              <Database className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Search Collections</span>
            </h2>

            {/* Right: Logo */}
            <Link to="/" className="flex items-center group" title="Back to Home">
              <div className="relative">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 via-orange-500 to-amber-500 shadow-md ring-2 ring-red-100 dark:ring-red-950/40 overflow-hidden transform group-hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0.5 rounded-full border border-dashed border-white/35" />
                  <KitchenLogo className="w-5 h-5 text-white z-30" plateColor="white" letterColor="white" />
                </div>
                <div className="absolute -top-1 -right-1 z-40 pointer-events-none flex items-center justify-center">
                  <div className="absolute w-3 h-3 bg-yellow-300 rounded-full blur-[1.5px] opacity-85 animate-ping" />
                  <Sparkles className="relative w-3.5 h-3.5 text-yellow-300 fill-yellow-200 drop-shadow-[0_0_6px_rgba(253,224,71,1)] animate-pulse" />
                </div>
              </div>
            </Link>
          </div>
        </header>

        {/* Search Main Section */}
        <main className="flex-grow w-full max-w-full px-0 py-8 flex flex-col items-center justify-start">
          <LocalFirstSearch
            recipes={recipes}
            collections={collections}
            onEditRecipe={(recipe) => navigate(`/recipes/edit/${recipe.id}`)}
            isOffline={isOffline}
          />
        </main>
      </div>
    </div>
  );
}
