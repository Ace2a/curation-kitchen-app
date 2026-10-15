import React, { useState } from "react";
import { Download, Check, Loader2, Settings, BookOpen } from "lucide-react";
import { Button } from "../ui/button";
import { RecipeModel, PantryModel } from "../../models";

export function UserSettings() {
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [activeTab, setActiveTab] = useState<"parser" | "barcode" | "restock">("parser");

  const handleExportKitchenData = async () => {
    try {
      setIsExporting(true);
      const [recipes, pantry] = await Promise.all([
        RecipeModel.find(),
        PantryModel.find(),
      ]);

      const exportPayload = {
        app: "Curation Kitchen",
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        recipes,
        pantry,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "curation-kitchen-backup.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (err) {
      console.error("Failed to export kitchen data:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white/90 dark:bg-zinc-900/90 border border-[#E6DFC6] dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-5">
      <div className="flex items-center gap-2.5 pb-3 border-b border-stone-200 dark:border-zinc-800">
        <Settings className="w-5 h-5 text-[#D95338]" />
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">User Settings</h2>
      </div>

      {/* Data Portability Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Backup & Data Portability</h3>
          <p className="text-xs text-stone-500 dark:text-zinc-400">
            Download a portable copy of your recipes and pantry inventory.
          </p>
        </div>

        <Button
          onClick={handleExportKitchenData}
          disabled={isExporting}
          className="rounded-xl bg-[#D95338] hover:bg-[#c2462e] text-white text-xs font-bold px-4 py-2 flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : exported ? (
            <Check className="w-4 h-4 text-emerald-300" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>{exported ? "Downloaded!" : "Export Kitchen Data"}</span>
        </Button>
      </div>

      {/* In-App Kitchen Handbook */}
      <div className="pt-4 border-t border-stone-200 dark:border-zinc-800">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF6EE] dark:bg-zinc-950/60 border border-[#E6DFC6] dark:border-zinc-800/80 space-y-3.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#D95338]" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">In-App Kitchen Handbook</h3>
          </div>

          {/* Horizontal Tab Row with Mobile Optimization (-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto) */}
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-200/70 dark:bg-zinc-900/80 border border-stone-200/80 dark:border-zinc-800 w-max sm:w-full">
              <button
                type="button"
                onClick={() => setActiveTab("parser")}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 flex-1 ${
                  activeTab === "parser"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs"
                    : "text-stone-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                AI Parser
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("barcode")}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 flex-1 ${
                  activeTab === "barcode"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs"
                    : "text-stone-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Barcode Scanner
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("restock")}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 flex-1 ${
                  activeTab === "restock"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs"
                    : "text-stone-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Smart Restocking
              </button>
            </div>
          </div>

          {/* Content Description Panel with Stabilized Minimum Height (min-h-[72px]) */}
          <div className="min-h-[72px] p-3.5 rounded-xl bg-white dark:bg-zinc-900/90 border border-[#E6DFC6]/80 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed flex items-center shadow-2xs">
            {activeTab === "parser" && (
              <p>
                Paste any recipe web link, messy text block, or upload a photo of an old family recipe card. Our AI instantly extracts the clean ingredients list and categorizes it for you!
              </p>
            )}
            {activeTab === "barcode" && (
              <p>
                Scan a grocery barcode to log branded pantry items instantly. Typing a 4-5 digit produce sticker code? The system automatically detects organic items if it starts with a 9!
              </p>
            )}
            {activeTab === "restock" && (
              <p>
                Running low on staples? Use the 1-click batch restock button to instantly move depleted items from your pantry history straight over to your grocery shopping list.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserSettings;
