/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface AlertDialogContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogContextProps | undefined>(undefined);

export function AlertDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogTrigger({ children, asChild }: { children: React.ReactElement<any>; asChild?: boolean }) {
  const context = useContext(AlertDialogContext);
  if (!context) throw new Error("AlertDialogTrigger must be used within AlertDialog");

  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      if ((children.props as any)?.onClick) (children.props as any).onClick(e);
      context.setOpen(true);
    },
  });
}

export function AlertDialogContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const context = useContext(AlertDialogContext);
  if (!context) throw new Error("AlertDialogContent must be used within AlertDialog");

  return (
    <AnimatePresence>
      {context.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              context.setOpen(false);
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative z-50 w-full max-w-md gap-4 border border-zinc-200 bg-white p-6 shadow-lg duration-200 rounded-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function AlertDialogHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col space-y-2 text-center sm:text-left ${className}`}>
      {children}
    </div>
  );
}

export function AlertDialogTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-lg font-semibold text-zinc-900 dark:text-zinc-50 ${className}`}>
      {children}
    </h3>
  );
}

export function AlertDialogDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-sm text-zinc-500 dark:text-zinc-400 ${className}`}>
      {children}
    </p>
  );
}

export function AlertDialogFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6 ${className}`}>
      {children}
    </div>
  );
}

export function AlertDialogCancel({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const context = useContext(AlertDialogContext);
  if (!context) throw new Error("AlertDialogCancel must be used within AlertDialog");

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
        context.setOpen(false);
      }}
      className={`inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900 cursor-pointer sm:mt-0 ${className}`}
    >
      {children}
    </button>
  );
}

export function AlertDialogAction({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const context = useContext(AlertDialogContext);
  if (!context) throw new Error("AlertDialogAction must be used within AlertDialog");

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
        context.setOpen(false);
      }}
      className={`inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}
