/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useLocation } from "react-router-dom";

interface AppLayoutWrapperProps {
  children: React.ReactNode;
}

/**
 * Global App Layout Wrapper:
 * Dynamically applies the soft butter-cream into desaturated sage green ambient gradient
 * to all secondary workspace routes, while isolating and preserving the dedicated
 * full-screen wallpaper styling of the Recipe Dashboard home screen.
 */
export function AppLayoutWrapper({ children }: AppLayoutWrapperProps) {
  const location = useLocation();
  const isHomeScreen = location.pathname === "/";

  if (isHomeScreen) {
    return (
      <div id="app-root-shell" className="app-shell-home w-full min-h-screen relative">
        {children}
      </div>
    );
  }

  return (
    <div
      id="app-root-shell"
      data-route={location.pathname}
      className="app-shell-ambient w-full min-h-screen relative text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
    >
      {/* Dynamic Ambient Background Layer (Butter-cream #FAF6EE -> Desaturated Sage Green Accent) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      >
        {/* Primary soft gradient flow (Rich Butter-cream to Distinct Sage Green) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF6EE] via-[#EBF3E8] to-[#D5E5D1] dark:from-zinc-950 dark:via-[#121914] dark:to-[#0f1a12]" />

        {/* Top-Right Desaturated Sage Green Ambient Glow */}
        <div
          className="absolute -top-32 -right-32 w-96 sm:w-[650px] h-96 sm:h-[650px] rounded-full blur-3xl opacity-75 dark:opacity-25 pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(110, 139, 107, 0.35) 0%, rgba(250, 246, 238, 0) 70%)",
          }}
        />

        {/* Bottom-Left Warm Butter-cream / Terracotta Highlight */}
        <div
          className="absolute -bottom-32 -left-32 w-80 sm:w-[600px] h-80 sm:h-[600px] rounded-full blur-3xl opacity-60 dark:opacity-15 pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(217, 83, 56, 0.14) 0%, rgba(250, 246, 238, 0) 70%)",
          }}
        />

        {/* Center Diffuse Butter-cream Highlight */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[500px] rounded-full blur-3xl opacity-60 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(250, 246, 238, 0.95) 0%, rgba(230, 240, 227, 0) 70%)",
          }}
        />
      </div>

      {/* Secondary Routes Content Container with isolated z-index */}
      <div className="ambient-page-content relative z-10 w-full min-h-screen">
        {children}
      </div>
    </div>
  );
}
