"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface QueueFlowInlineProps {
  /**
   * Optional inline text
   */
  text?: string;
  /**
   * Component size
   */
  size?: "sm" | "md";
  /**
   * Color accent
   */
  color?: "primary" | "white" | "success";
  /**
   * Additional classes
   */
  className?: string;
}

/**
 * QueueFlowInline
 * 
 * Compact micro-animation representing queue flow in constrained spaces
 * such as button interiors, badges, and small table cells.
 */
export default function QueueFlowInline({
  text,
  size = "md",
  color = "primary",
  className,
}: QueueFlowInlineProps) {
  const shouldReduceMotion = useReducedMotion();

  const isSm = size === "sm";

  const colorStyles = {
    primary: {
      ticketBg: "bg-blue-600",
      ticketBorder: "border-blue-400",
      trail: "bg-blue-400",
      text: "text-blue-400",
    },
    white: {
      ticketBg: "bg-white",
      ticketBorder: "border-blue-200",
      trail: "bg-white/80",
      text: "text-white",
    },
    success: {
      ticketBg: "bg-emerald-500",
      ticketBorder: "border-emerald-300",
      trail: "bg-emerald-400",
      text: "text-emerald-400",
    },
  }[color];

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-2 select-none", className)}
    >
      {/* Micro Queue Visual: 2 small ticket blocks advancing to target dot */}
      <span className="relative inline-flex items-center justify-center w-7 h-4">
        {/* Destination counter dot */}
        <span
          className={cn(
            "absolute right-0 rounded-full",
            isSm ? "w-1.5 h-1.5" : "w-2 h-2",
            colorStyles.ticketBg
          )}
        />

        {/* Trail dot 1 */}
        {!shouldReduceMotion ? (
          <motion.span
            className={cn("absolute rounded-full", isSm ? "w-1 h-1" : "w-1.5 h-1.5", colorStyles.trail)}
            animate={{
              x: [-14, 0],
              opacity: [0, 1, 0],
              scale: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ) : null}

        {/* Lead mini ticket advancing */}
        {!shouldReduceMotion ? (
          <motion.span
            className={cn(
              "absolute rounded-[2px] border",
              isSm ? "w-2.5 h-2" : "w-3 h-2.5",
              colorStyles.ticketBg,
              colorStyles.ticketBorder
            )}
            animate={{
              x: [-12, 4],
              opacity: [0.3, 1, 0.2],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: 0.3,
              ease: "easeInOut",
            }}
          />
        ) : (
          <span
            className={cn(
              "absolute left-0 rounded-[2px] border",
              isSm ? "w-2.5 h-2" : "w-3 h-2.5",
              colorStyles.ticketBg,
              colorStyles.ticketBorder
            )}
          />
        )}
      </span>

      {text && (
        <span
          className={cn(
            "font-semibold tracking-tight",
            isSm ? "text-xs" : "text-sm",
            colorStyles.text
          )}
        >
          {text}
        </span>
      )}
    </span>
  );
}
