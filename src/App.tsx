/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import RecipeDashboard from "./components/recipes/RecipeDashboard";
import Collections from "./components/collections/Collections";
import RecipeDetails from "./components/recipes/RecipeDetails";
import FavoritesPage from "./components/recipes/FavoritesPage";
import OfflineIndicator from "./components/ui/OfflineIndicator";
import { PantryModal } from "./components/pantry/PantryModal";
import { PantryHub } from "./components/pantry/PantryHub";
import { MealPlanner } from "./components/planner/MealPlanner";
import { CategoryFilterModal } from "./components/recipes/CategoryFilterModal";
import RecipeFormModal from "./components/recipes/RecipeFormModal";
import LocalSearchPage from "./components/recipes/LocalSearchPage";
import NutritionPage from "./components/recipes/NutritionPage";
import { OnboardingModal } from "./components/onboarding/OnboardingModal";
import { recipeClient } from "./api/recipeClient";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";

function OnboardingPage() {
  const navigate = useNavigate();
  return <OnboardingModal isOpen={true} onClose={() => navigate("/")} />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PantryPage() {
  const navigate = useNavigate();
  return <PantryHub isPage={true} onClose={() => navigate("/")} />;
}

function UpcScannerPage() {
  const navigate = useNavigate();
  return <PantryModal isOpen={true} isPage={true} initialTab="upc" onClose={() => navigate("/pantry")} />;
}

function PlannerPage() {
  const navigate = useNavigate();
  return <MealPlanner isOpen={true} onClose={() => navigate("/")} isPage={true} />;
}

function CategoriesPage() {
  const navigate = useNavigate();
  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => recipeClient.collections.list("-created_date"),
  });
  return (
    <CategoryFilterModal
      isOpen={true}
      onClose={() => navigate("/")}
      isPage={true}
      collections={collections}
      onEditRecipe={(recipe) => navigate(`/recipes/edit/${recipe.id}`)}
    />
  );
}

function NewRecipePage() {
  const navigate = useNavigate();
  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => recipeClient.collections.list("-created_date"),
  });
  return (
    <RecipeFormModal
      open={true}
      onClose={() => navigate("/")}
      isPage={true}
      collections={collections}
    />
  );
}

function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => recipeClient.collections.list("-created_date"),
  });
  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => recipeClient.recipes.list("-created_date"),
  });
  const recipe = recipes.find((r) => r.id === id) || null;

  return (
    <RecipeFormModal
      open={true}
      onClose={() => navigate("/")}
      isPage={true}
      recipe={recipe}
      collections={collections}
    />
  );
}

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 text-center">
      <div className="max-w-md space-y-4">
        <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto text-2xl font-black">
          404
        </div>
        <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Page Not Found</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          The page or recipe route you are trying to visit does not exist or may have been moved.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
        >
          Return to Workspace
        </button>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // Background PWA install prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleSyncComplete = () => {
      // Invalidate and refetch all active queries to align cache with server truth
      queryClient.invalidateQueries();
    };
    window.addEventListener("offline-sync-complete", handleSyncComplete);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("offline-sync-complete", handleSyncComplete);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RecipeDashboard />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/recipes/:id" element={<RecipeDetails />} />
            <Route path="/pantry" element={<PantryPage />} />
            <Route path="/pantry/upc" element={<UpcScannerPage />} />
            <Route path="/upc-scanner" element={<UpcScannerPage />} />
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/recipes/new" element={<NewRecipePage />} />
            <Route path="/recipes/edit/:id" element={<EditRecipePage />} />
            <Route path="/local-search" element={<LocalSearchPage />} />
            <Route path="/nutrition" element={<NutritionPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
