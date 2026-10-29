/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { MealPlannerModal } from "./MealPlannerModal";

export interface MealPlannerProps {
  isOpen?: boolean;
  onClose?: () => void;
  isPage?: boolean;
  className?: string;
}

/**
 * MealPlanner
 * Responsive parent layout container wrapper for the Weekly Editorial Meal Planner view.
 * Stabilizes horizontal boundaries, prevents layout shifts and viewport scroll jumping,
 * and standardizes responsive containment across mobile, tablet, and desktop viewports.
 */
export function MealPlanner({
  isOpen = true,
  onClose,
  isPage = true,
  className = "",
}: MealPlannerProps) {
  return (
    <div
      className={`w-full min-h-screen bg-[#FAF6EE] dark:bg-zinc-950 overflow-x-hidden selection:bg-[#6E8B6B]/20 relative flex flex-col ${className}`}
      id="meal-planner-layout-wrapper"
    >
      <div className="w-full max-w-full mx-auto relative flex-1 flex flex-col">
        <MealPlannerModal isOpen={isOpen} onClose={onClose} isPage={isPage} />
      </div>
    </div>
  );
}

export default MealPlanner;
