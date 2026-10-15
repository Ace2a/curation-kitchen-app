/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", children, ...props }, ref) => {
    let baseStyle = "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none";
    
    // Variants
    let variantStyle = "bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800";
    if (variant === "outline") {
      variantStyle = "border border-zinc-200 bg-transparent hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-100";
    } else if (variant === "ghost") {
      variantStyle = "bg-transparent hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100";
    } else if (variant === "destructive") {
      variantStyle = "bg-red-600 text-white hover:bg-red-700 active:bg-red-800";
    }

    // Sizes
    let sizeStyle = "h-10 px-4 py-2 rounded-xl text-sm";
    if (size === "sm") {
      sizeStyle = "h-8 px-3 rounded-lg text-xs";
    } else if (size === "lg") {
      sizeStyle = "h-12 px-8 rounded-2xl text-base";
    } else if (size === "icon") {
      sizeStyle = "h-10 w-10 p-0 rounded-xl";
    }

    const combinedClasses = `${baseStyle} ${variantStyle} ${sizeStyle} ${className}`.trim();

    return (
      <button ref={ref} className={combinedClasses} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
