/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { Recipe } from "../../types";
import { 
  ConsolidatedPantryItem, 
  canonicalizeIngredientName, 
  cleanIngredientTitle, 
  getProductEmoji 
} from "../../lib/pantryUtils";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ShoppingCart, 
  TrendingUp, 
  ArrowUpDown, 
  Layers,
  Sparkles,
  Info,
  ChevronUp
} from "lucide-react";
import { Button } from "../ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { recipeClient } from "../../api/recipeClient";

interface PantryInventoryHealthProps {
  recipes: Recipe[];
  consolidatedItems: ConsolidatedPantryItem[];
  onToggleCollapse?: () => void;
}

interface StapleHealthItem {
  name: string;
  emoji: string;
  recipeCount: number;
  recipes: string[];
  stockQuantity: number;
  status: "In Stock" | "Running Low" | "Out of Stock";
  healthStatus: "Healthy" | "Low" | "Depleted";
  category: string;
}

export function PantryInventoryHealth({ recipes, consolidatedItems, onToggleCollapse }: PantryInventoryHealthProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState<"all" | "at-risk" | "healthy">("all");
  const [sortBy, setSortBy] = useState<"frequency" | "stock">("frequency");
  const [hoveredItem, setHoveredItem] = useState<StapleHealthItem | null>(null);
  const [restockingNames, setRestockingNames] = useState<Record<string, boolean>>({});
  const [batchRestockDone, setBatchRestockDone] = useState(false);

  // 1. Calculate frequency of ingredients across all recipes
  const stapleHealthData = useMemo<StapleHealthItem[]>(() => {
    const frequencyMap = new Map<string, { count: number; recipes: string[]; category?: string }>();

    (recipes || []).forEach((r) => {
      (r.ingredients || []).forEach((ing) => {
        const rawText = typeof ing === "string" ? ing : (ing.name || ing.raw || "");
        const clean = canonicalizeIngredientName(cleanIngredientTitle(rawText)) || rawText.trim();
        if (!clean || clean.length < 2) return;

        const current = frequencyMap.get(clean) || { count: 0, recipes: [] };
        current.count += 1;
        if (!current.recipes.includes(r.title)) {
          current.recipes.push(r.title);
        }
        frequencyMap.set(clean, current);
      });
    });

    // Map consolidated pantry inventory by lowercase clean name
    const pantryMap = new Map<string, ConsolidatedPantryItem>();
    (consolidatedItems || []).forEach((item) => {
      pantryMap.set(item.name.toLowerCase().trim(), item);
    });

    const list: StapleHealthItem[] = [];

    frequencyMap.forEach((meta, name) => {
      const pItem = pantryMap.get(name.toLowerCase().trim());
      const stockQuantity = pItem ? pItem.quantityNumber : 0;
      const category = pItem?.category || "Pantry Staples";
      const emoji = getProductEmoji(category, name);

      let healthStatus: "Healthy" | "Low" | "Depleted" = "Healthy";
      let status: "In Stock" | "Running Low" | "Out of Stock" = "In Stock";

      if (stockQuantity <= 0 || pItem?.status === "Out of Stock") {
        healthStatus = "Depleted";
        status = "Out of Stock";
      } else if (stockQuantity <= 2 || pItem?.status === "Running Low") {
        healthStatus = "Low";
        status = "Running Low";
      } else {
        healthStatus = "Healthy";
        status = "In Stock";
      }

      list.push({
        name,
        emoji,
        recipeCount: meta.count,
        recipes: meta.recipes,
        stockQuantity,
        status,
        healthStatus,
        category,
      });
    });

    // Sort by recipe count (frequency) descending
    return list.sort((a, b) => b.recipeCount - a.recipeCount);
  }, [recipes, consolidatedItems]);

  // Top frequently used staples (take top 8-10 most popular ingredients in cookbook)
  const topStaples = useMemo(() => {
    let filtered = [...stapleHealthData];
    if (activeFilter === "at-risk") {
      filtered = filtered.filter((d) => d.healthStatus !== "Healthy");
    } else if (activeFilter === "healthy") {
      filtered = filtered.filter((d) => d.healthStatus === "Healthy");
    }

    if (sortBy === "frequency") {
      filtered.sort((a, b) => b.recipeCount - a.recipeCount || b.stockQuantity - a.stockQuantity);
    } else {
      filtered.sort((a, b) => a.stockQuantity - b.stockQuantity || b.recipeCount - a.recipeCount);
    }

    return filtered.slice(0, 8);
  }, [stapleHealthData, activeFilter, sortBy]);

  // Overall Health Metrics
  const totalStaples = stapleHealthData.length;
  const healthyCount = stapleHealthData.filter((d) => d.healthStatus === "Healthy").length;
  const lowCount = stapleHealthData.filter((d) => d.healthStatus === "Low").length;
  const depletedCount = stapleHealthData.filter((d) => d.healthStatus === "Depleted").length;
  const overallHealthScore = totalStaples > 0 ? Math.round((healthyCount / totalStaples) * 100) : 0;

  // 2. D3 Render Bar Chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth || 600;
    const isMobile = containerWidth < 480;
    const margin = { 
      top: 24, 
      right: isMobile ? 55 : 85, 
      bottom: 24, 
      left: isMobile ? 120 : 155 
    };
    const rowHeight = 38;
    const height = Math.max(220, topStaples.length * rowHeight + margin.top + margin.bottom);
    const width = containerWidth;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // clear prior elements

    svg.attr("width", width).attr("height", height);

    if (topStaples.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#78716c")
        .attr("font-size", "13px")
        .attr("font-family", "sans-serif")
        .text("No ingredients match the active filter criteria.");
      return;
    }

    // Maximum quantity domain (minimum 6 for consistent scale)
    const maxQty = Math.max(6, d3.max(topStaples, (d) => d.stockQuantity) || 6);

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, maxQty])
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleBand()
      .domain(topStaples.map((d) => d.name))
      .range([margin.top, height - margin.bottom])
      .padding(0.28);

    // Grid lines (vertical)
    const xTicks = xScale.ticks(5);
    svg
      .append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(xTicks)
      .join("line")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "#e7e5e4")
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0.7);

    // Baseline axis line
    svg
      .append("line")
      .attr("x1", margin.left)
      .attr("x2", margin.left)
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "#d6d3d1")
      .attr("stroke-width", 1.5);

    // Background track bars (for progress context)
    svg
      .selectAll(".bg-bar")
      .data(topStaples)
      .join("rect")
      .attr("class", "bg-bar")
      .attr("x", margin.left)
      .attr("y", (d) => yScale(d.name) || 0)
      .attr("width", width - margin.left - margin.right)
      .attr("height", yScale.bandwidth())
      .attr("rx", 6)
      .attr("fill", "#f5f5f4")
      .attr("opacity", 0.6);

    // Main Value Bars
    const bars = svg
      .selectAll(".stock-bar")
      .data(topStaples)
      .join("rect")
      .attr("class", "stock-bar")
      .attr("x", margin.left)
      .attr("y", (d) => yScale(d.name) || 0)
      .attr("height", yScale.bandwidth())
      .attr("rx", 6)
      .attr("cursor", "pointer")
      .attr("fill", (d) => {
        if (d.healthStatus === "Healthy") return "#6E8B6B"; // sage green
        if (d.healthStatus === "Low") return "#d97706"; // amber
        return "#D95338"; // terracotta red for depleted
      })
      .attr("width", 0); // start at 0 for smooth entrance transition

    // Animate bars on render
    bars
      .transition()
      .duration(650)
      .ease(d3.easeCubicOut)
      .attr("width", (d) => {
        const valWidth = xScale(d.stockQuantity) - margin.left;
        // Even if 0 stock, show a tiny 4px indicator strip
        return Math.max(valWidth, d.stockQuantity === 0 ? 5 : 10);
      });

    // Hover interactions
    bars
      .on("mouseenter", function (_event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("opacity", 0.82)
          .attr("stroke", "#1c1917")
          .attr("stroke-width", 1.5);
        setHoveredItem(d);
      })
      .on("mouseleave", function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("opacity", 1)
          .attr("stroke", "none");
        setHoveredItem(null);
      });

    // Value Labels on the right of each bar
    svg
      .selectAll(".val-label")
      .data(topStaples)
      .join("text")
      .attr("class", "val-label")
      .attr("x", (d) => {
        const barW = Math.max(xScale(d.stockQuantity) - margin.left, d.stockQuantity === 0 ? 5 : 10);
        return margin.left + barW + 8;
      })
      .attr("y", (d) => (yScale(d.name) || 0) + yScale.bandwidth() / 2 + 4)
      .attr("font-size", isMobile ? "10px" : "11px")
      .attr("font-weight", "700")
      .attr("font-family", "ui-monospace, monospace")
      .attr("fill", (d) => {
        if (d.healthStatus === "Healthy") return "#2e7d32";
        if (d.healthStatus === "Low") return "#b45309";
        return "#c2410c";
      })
      .text((d) => `${d.stockQuantity} ${d.stockQuantity === 1 ? "unit" : "units"}`);

    // Left Y-Axis Labels: Ingredient Emoji + Name + Recipe Count Subtext
    const yLabels = svg
      .selectAll(".y-label-group")
      .data(topStaples)
      .join("g")
      .attr("class", "y-label-group")
      .attr("cursor", "pointer")
      .on("mouseenter", (_event, d) => setHoveredItem(d))
      .on("mouseleave", () => setHoveredItem(null));

    // Ingredient Name Text
    yLabels
      .append("text")
      .attr("x", margin.left - 8)
      .attr("y", (d) => (yScale(d.name) || 0) + yScale.bandwidth() / 2 - 2)
      .attr("text-anchor", "end")
      .attr("font-size", isMobile ? "11px" : "12px")
      .attr("font-weight", "600")
      .attr("fill", "#1c1917")
      .text((d) => {
        const full = `${d.emoji} ${d.name}`;
        if (isMobile && full.length > 14) return `${full.slice(0, 13)}…`;
        return full;
      });

    // Recipe Frequency Subtext
    yLabels
      .append("text")
      .attr("x", margin.left - 8)
      .attr("y", (d) => (yScale(d.name) || 0) + yScale.bandwidth() / 2 + 10)
      .attr("text-anchor", "end")
      .attr("font-size", "9px")
      .attr("font-weight", "500")
      .attr("fill", "#78716c")
      .text((d) => `in ${d.recipeCount} ${d.recipeCount === 1 ? "recipe" : "recipes"}`);

    // Bottom X-Axis ticks
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.min(5, maxQty))
      .tickFormat((d) => `${d}u`);

    svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .call((g) => g.select(".domain").attr("stroke", "#d6d3d1"))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#d6d3d1"))
      .call((g) =>
        g
          .selectAll(".tick text")
          .attr("fill", "#78716c")
          .attr("font-size", "10px")
          .attr("font-family", "ui-monospace, monospace")
      );
  }, [topStaples]);

  // Quick Restock Action (adds item to grocery list)
  const handleRestock = async (item: StapleHealthItem) => {
    try {
      setRestockingNames((prev) => ({ ...prev, [item.name]: true }));
      await recipeClient.grocery.create({
        name: item.name,
        quantity: "2 units",
        checked: false,
        category: item.category,
      });
      queryClient.invalidateQueries({ queryKey: ["grocery"] });
      setTimeout(() => {
        setRestockingNames((prev) => ({ ...prev, [item.name]: false }));
      }, 3000);
    } catch (err) {
      console.error("Restock failed", err);
      setRestockingNames((prev) => ({ ...prev, [item.name]: false }));
    }
  };

  // Batch restock all depleted staples
  const handleBatchRestockDepleted = async () => {
    const depleted = stapleHealthData.filter((d) => d.healthStatus === "Depleted");
    if (depleted.length === 0) return;

    try {
      for (const item of depleted) {
        await recipeClient.grocery.create({
          name: item.name,
          quantity: "2 units",
          checked: false,
          category: item.category,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["grocery"] });
      setBatchRestockDone(true);
      setTimeout(() => setBatchRestockDone(false), 3500);
    } catch (err) {
      console.error("Batch restock failed", err);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-[#E6DFC6] dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6DFC6]/60 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-[#6E8B6B]/15 text-[#6E8B6B] shadow-2xs">
            <Activity className="w-6 h-6 stroke-[2.2]" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-serif font-bold text-zinc-900 dark:text-white">
                Pantry Inventory Health
              </h3>
              <span className="inline-flex items-center gap-1 bg-[#6E8B6B]/15 text-[#6E8B6B] text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-[#6E8B6B]/30 font-mono">
                <Sparkles className="w-2.5 h-2.5" /> D3 Analytics
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
              Live stock status and buffer levels for your most frequently required culinary ingredients.
            </p>
          </div>
        </div>

        {/* HEADER ACTIONS */}
        <div className="flex items-center gap-2 shrink-0">
          {/* BATCH RESTOCK CTA */}
          {depletedCount > 0 && (
            <Button
              onClick={handleBatchRestockDepleted}
              size="sm"
              className={`rounded-full text-xs font-bold px-3.5 py-1.5 transition-all shadow-sm cursor-pointer shrink-0 ${
                batchRestockDone
                  ? "bg-[#6E8B6B] text-white"
                  : "bg-[#D95338] hover:bg-[#c2462e] text-white"
              }`}
            >
              {batchRestockDone ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span>Added to Grocery List!</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                  <span>Restock {depletedCount} Depleted Staples</span>
                </>
              )}
            </Button>
          )}

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-xl bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 transition-colors cursor-pointer"
              title="Hide inventory health graph"
              aria-label="Hide inventory health graph"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI METRIC TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Overall Health Index */}
        <div className="p-3.5 rounded-2xl bg-[#FAF6EE] dark:bg-zinc-800/60 border border-[#E6DFC6] dark:border-zinc-700/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold">Health Score</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#6E8B6B]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-zinc-900 dark:text-white">
              {overallHealthScore}%
            </span>
            <span className="text-[11px] font-bold text-[#6E8B6B]">
              {overallHealthScore >= 70 ? "Optimal" : overallHealthScore >= 40 ? "Moderate" : "Action Needed"}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-stone-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                overallHealthScore >= 70 ? "bg-[#6E8B6B]" : overallHealthScore >= 40 ? "bg-amber-500" : "bg-[#D95338]"
              }`}
              style={{ width: `${overallHealthScore}%` }}
            />
          </div>
        </div>

        {/* Well Stocked Staples */}
        <div className="p-3.5 rounded-2xl bg-[#FAF6EE] dark:bg-zinc-800/60 border border-[#E6DFC6] dark:border-zinc-700/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold">Healthy Stock</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#6E8B6B]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-[#6E8B6B]">
              {healthyCount}
            </span>
            <span className="text-xs text-stone-400">/ {totalStaples} staples</span>
          </div>
          <p className="mt-2 text-[10px] text-stone-500">≥ 3 units available in pantry</p>
        </div>

        {/* Running Low Staples */}
        <div className="p-3.5 rounded-2xl bg-[#FAF6EE] dark:bg-zinc-800/60 border border-[#E6DFC6] dark:border-zinc-700/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold">Running Low</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-amber-600">
              {lowCount}
            </span>
            <span className="text-xs text-stone-400">staples</span>
          </div>
          <p className="mt-2 text-[10px] text-stone-500">1 to 2 units remaining</p>
        </div>

        {/* Depleted / Out of Stock */}
        <div className="p-3.5 rounded-2xl bg-[#FAF6EE] dark:bg-zinc-800/60 border border-[#E6DFC6] dark:border-zinc-700/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold">Depleted</span>
            <span className="w-2 h-2 rounded-full bg-[#D95338] animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-[#D95338]">
              {depletedCount}
            </span>
            <span className="text-xs text-stone-400">critical</span>
          </div>
          <p className="mt-2 text-[10px] text-stone-500">0 units (blocking recipes)</p>
        </div>
      </div>

      {/* FILTER & SORT CONTROLS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === "all"
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-2xs"
                : "bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            All Top Staples ({topStaples.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("at-risk")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeFilter === "at-risk"
                ? "bg-[#D95338] text-white shadow-2xs"
                : "bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Needs Restock ({lowCount + depletedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("healthy")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeFilter === "healthy"
                ? "bg-[#6E8B6B] text-white shadow-2xs"
                : "bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Well Stocked ({healthyCount})</span>
          </button>
        </div>

        {/* Sort Toggle */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[11px] text-stone-500 font-medium hidden sm:inline">Sort by:</span>
          <button
            type="button"
            onClick={() => setSortBy(sortBy === "frequency" ? "stock" : "frequency")}
            className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 text-stone-700 dark:text-zinc-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3 h-3 text-stone-400" />
            <span>{sortBy === "frequency" ? "Recipe Popularity" : "Stock Quantity"}</span>
          </button>
        </div>
      </div>

      {/* D3 BAR CHART VIEWPORT */}
      <div 
        ref={containerRef} 
        className="relative w-full rounded-2xl bg-[#FAF6EE]/90 dark:bg-zinc-950/40 p-2 sm:p-3 border border-[#E6DFC6]/80 dark:border-zinc-800/80 overflow-hidden"
      >
        <svg ref={svgRef} className="w-full overflow-visible" />

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-end gap-3.5 pt-2 pr-2 text-[10px] text-stone-500">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#6E8B6B]" />
            <span>Healthy (≥ 3u)</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#d97706]" />
            <span>Running Low (1-2u)</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#D95338]" />
            <span>Depleted (0u)</span>
          </span>
        </div>

        {/* Interactive Hover Tooltip Overlay */}
        {hoveredItem && (
          <div className="mt-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-[#E6DFC6] dark:border-zinc-700 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{hoveredItem.emoji}</span>
                <span className="font-bold text-sm text-zinc-900 dark:text-white">
                  {hoveredItem.name}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    hoveredItem.healthStatus === "Healthy"
                      ? "bg-[#6E8B6B]/15 text-[#6E8B6B]"
                      : hoveredItem.healthStatus === "Low"
                      ? "bg-amber-500/15 text-amber-700"
                      : "bg-[#D95338]/15 text-[#D95338]"
                  }`}
                >
                  {hoveredItem.healthStatus === "Healthy" ? "✓ Optimal Stock" : hoveredItem.healthStatus === "Low" ? "⚠ Low Buffer" : "✗ Depleted"}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Required in <strong>{hoveredItem.recipeCount} recipes</strong> ({hoveredItem.recipes.slice(0, 3).join(", ")}
                {hoveredItem.recipes.length > 3 ? "..." : ""}) • Current Stock: <strong>{hoveredItem.stockQuantity} units</strong>
              </p>
            </div>

            {/* Quick Restock Action Button */}
            {hoveredItem.stockQuantity < 3 && (
              <Button
                onClick={() => handleRestock(hoveredItem)}
                size="sm"
                className={`rounded-xl text-xs font-bold px-3 py-1 cursor-pointer shadow-xs ${
                  restockingNames[hoveredItem.name]
                    ? "bg-[#6E8B6B] text-white"
                    : "bg-[#D95338] hover:bg-[#c2462e] text-white"
                }`}
              >
                {restockingNames[hoveredItem.name] ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    <span>Added to List!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                    <span>Add 2 Units to Grocery</span>
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
