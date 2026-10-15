/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Copy, FileJson, Check, Share2 } from "lucide-react";
import { Button } from "../ui/button";
import { formatTotalTime } from "../../lib/timeUtils";
import { Collection, Recipe } from "../../types";

interface CollectionExportModalProps {
  open: boolean;
  onClose: () => void;
  collection: Collection | null;
  recipes: Recipe[];
}

export default function CollectionExportModal({ open, onClose, collection, recipes }: CollectionExportModalProps) {
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!collection) return null;

  // Filter recipes that belong to this collection
  const collectionRecipes = recipes.filter((r) => collection.recipe_ids?.includes(r.id) || r.collection_id === collection.id);

  // Generate beautiful Markdown of the recipe book
  const generateMarkdown = () => {
    let md = `# 📖 Cookbook: ${collection.name}\n\n`;
    if (collection.description) {
      md += `> ${collection.description}\n\n`;
    }
    md += `This cookbook contains **${collectionRecipes.length}** handpicked recipe${collectionRecipes.length !== 1 ? "s" : ""}.\n\n---\n\n`;

    collectionRecipes.forEach((recipe, idx) => {
      md += `## ${idx + 1}. ${recipe.title}\n\n`;
      md += `${recipe.description}\n\n`;
      md += `* **Prep Time:** ${recipe.prep_time} | **Cook Time:** ${recipe.cook_time} | **Total Time:** ${formatTotalTime(recipe.prep_time, recipe.cook_time)} | **Servings:** ${recipe.servings}\n`;
      if (recipe.tags && recipe.tags.length > 0) {
        md += `* **Tags:** ${recipe.tags.join(", ")}\n`;
      }
      md += `\n### 🛒 Ingredients\n`;
      recipe.ingredients.forEach((ing) => {
        md += `- [ ] ${ing}\n`;
      });
      md += `\n### 🍳 Instructions\n`;
      recipe.instructions.forEach((inst, step) => {
        md += `${step + 1}. ${inst}\n`;
      });
      md += `\n---\n\n`;
    });

    return md;
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdown();
    navigator.clipboard.writeText(md).then(() => {
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    });
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ collection, recipes: collectionRecipes }, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${collection.name.toLowerCase().replace(/\s+/g, "_")}_cookbook.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/?collection=${collection.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative z-50 w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-100"
          >
            {/* Top Color Bar */}
            <div className="h-2.5 w-full" style={{ backgroundColor: collection.color || "#c2410c" }} />

            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-xl font-bold font-sans text-zinc-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-amber-600" /> Export Cookbook
              </h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl h-8 w-8">
                <X className="w-5 h-5 text-zinc-500" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-zinc-800">{collection.name}</h3>
                <p className="text-sm text-zinc-500">{collection.description || "No description provided."}</p>
                <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 mt-2">
                  {collectionRecipes.length} Recipe{collectionRecipes.length !== 1 ? "s" : ""}
                </div>
              </div>

              <div className="space-y-3">
                {/* Copy Markdown */}
                <button
                  onClick={handleCopyMarkdown}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-left transition-all active:scale-[0.99] group cursor-pointer"
                >
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors">
                      <Copy className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-800">Copy as Markdown</h4>
                      <p className="text-xs text-zinc-500">Perfect to copy into Notion or Obsidian</p>
                    </div>
                  </div>
                  <div className="text-amber-600">
                    {copiedMarkdown ? <Check className="w-5 h-5 stroke-[2.5]" /> : <X className="w-5 h-5 opacity-0 group-hover:opacity-50" />}
                  </div>
                </button>

                {/* Download JSON */}
                <button
                  onClick={handleDownloadJson}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-left transition-all active:scale-[0.99] group cursor-pointer"
                >
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 group-hover:bg-violet-100 transition-colors">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-800">Download Data File</h4>
                      <p className="text-xs text-zinc-500">Backup collection & recipe data as JSON</p>
                    </div>
                  </div>
                  <div className="text-violet-600">
                    <FileJson className="w-5 h-5 opacity-0 group-hover:opacity-10" />
                  </div>
                </button>

                {/* Share Link */}
                <button
                  onClick={handleCopyShareLink}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-left transition-all active:scale-[0.99] group cursor-pointer"
                >
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-800">Copy Shareable Link</h4>
                      <p className="text-xs text-zinc-500">Get filtered dashboard link for this collection</p>
                    </div>
                  </div>
                  <div className="text-blue-600">
                    {copiedLink ? <Check className="w-5 h-5 stroke-[2.5]" /> : <X className="w-5 h-5 opacity-0 group-hover:opacity-50" />}
                  </div>
                </button>
              </div>

              <div className="pt-4 border-t border-zinc-100">
                <Button variant="outline" className="w-full rounded-xl" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
