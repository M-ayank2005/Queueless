"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Store, Check, Sparkles } from "lucide-react";

export interface QueueFlowLoaderProps {
  /**
   * Primary loading message (e.g., "Connecting to counter...", "Checking active queue status...")
   */
  message?: string;
  /**
   * Optional secondary subtitle message
   */
  submessage?: string;
  /**
   * Component size scale
   */
  size?: "sm" | "md" | "lg";
  /**
   * Display variant
   * - "page": Full-page centered with QueueLess header
   * - "card": Embedded inside a card boundary
   * - "overlay": Absolute overlay with backdrop blur
   * - "inline": Compact minimal block
   */
  variant?: "page" | "card" | "overlay" | "inline";
  /**
   * Whether to display the text message
   */
  showMessage?: boolean;
  /**
   * Additional container CSS classes
   */
  className?: string;
}

/**
 * QueueFlowLoader
 * 
 * QueueLess signature branded loading system.
 * Depicts digital queue tickets advancing smoothly along a illuminated pathway
 * toward a storefront service counter, culminating in an arrival glow.
 */
export default function QueueFlowLoader({
  message = "Loading...",
  submessage,
  size = "md",
  variant = "card",
  showMessage = true,
  className,
}: QueueFlowLoaderProps) {
  const shouldReduceMotion = useReducedMotion();

  // Dimensions based on size scale
  const sizeConfig = {
    sm: {
      svgWidth: 180,
      svgHeight: 52,
      ticketW: 24,
      ticketH: 17,
      msgSize: "text-xs",
      subSize: "text-[11px]",
      containerPadding: "py-4 px-3",
    },
    md: {
      svgWidth: 240,
      svgHeight: 64,
      ticketW: 30,
      ticketH: 22,
      msgSize: "text-sm",
      subSize: "text-xs",
      containerPadding: "py-8 px-6",
    },
    lg: {
      svgWidth: 300,
      svgHeight: 76,
      ticketW: 36,
      ticketH: 26,
      msgSize: "text-base",
      subSize: "text-xs",
      containerPadding: "py-12 px-8",
    },
  }[size];

  // SVG coordinate configuration
  // The track runs from X=24 to X=sizeConfig.svgWidth - 36
  const trackStartX = 24;
  const counterX = sizeConfig.svgWidth - 34;
  const trackY = sizeConfig.svgHeight / 2 + 4;
  const ticketY = trackY - sizeConfig.ticketH / 2;

  // Animation timeline configuration
  // Loop duration: 2.2 seconds for calm, smooth motion
  const loopDuration = 2.4;

  const animationContent = (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={cn("flex flex-col items-center justify-center select-none", className)}
    >
      {/* Visual Vector Queue Canvas */}
      <div className="relative flex items-center justify-center">
        <svg
          width={sizeConfig.svgWidth}
          height={sizeConfig.svgHeight}
          viewBox={`0 0 ${sizeConfig.svgWidth} ${sizeConfig.svgHeight}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          <defs>
            {/* Blue glow filter for advancing ticket & counter */}
            <filter id="qf-blue-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            {/* Emerald arrival glow */}
            <filter id="qf-arrival-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Gradient for progress track */}
            <linearGradient id="qf-track-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#203052" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.9" />
            </linearGradient>

            {/* Ticket Card Gradient */}
            <linearGradient id="qf-ticket-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1B2A52" />
              <stop offset="100%" stopColor="#101A32" />
            </linearGradient>

            <linearGradient id="qf-active-ticket-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>

          {/* 1. Underlying Pathway / Digital Queue Rail */}
          <line
            x1={trackStartX}
            y1={trackY}
            x2={counterX - 10}
            y2={trackY}
            stroke="#203052"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />

          {/* Animated Blue Progress Trail flowing toward the counter */}
          {!shouldReduceMotion ? (
            <motion.line
              x1={trackStartX}
              y1={trackY}
              x2={counterX - 10}
              y2={trackY}
              stroke="url(#qf-track-grad)"
              strokeWidth="2.5"
              strokeDasharray="6 8"
              strokeLinecap="round"
              animate={{
                strokeDashoffset: [28, 0],
              }}
              transition={{
                duration: loopDuration * 0.8,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ) : (
            <line
              x1={trackStartX}
              y1={trackY}
              x2={counterX - 10}
              y2={trackY}
              stroke="#3B82F6"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}

          {/* 2. Service Counter Desk / Storefront Icon on the Right */}
          <g transform={`translate(${counterX - 16}, ${trackY - 20})`}>
            {/* Counter Background Base */}
            <rect
              x="0"
              y="4"
              width="32"
              height="32"
              rx="8"
              fill="#101A32"
              stroke="#203052"
              strokeWidth="1.5"
            />

            {/* Counter Desk Ledge */}
            <rect
              x="-2"
              y="26"
              width="36"
              height="4"
              rx="2"
              fill="#152243"
              stroke="#203052"
              strokeWidth="1"
            />

            {/* Storefront Awning / Canopy Roof */}
            <path
              d="M2 12C2 7.58172 5.58172 4 10 4H22C26.4183 4 30 7.58172 30 12V14H2V12Z"
              fill="#152243"
            />
            <path
              d="M7 4V14 M16 4V14 M25 4V14"
              stroke="#203052"
              strokeWidth="1"
            />

            {/* Counter Calling Window Beacon (Pulsing light when ticket is served) */}
            {!shouldReduceMotion ? (
              <motion.circle
                cx="16"
                cy="20"
                r="4.5"
                animate={{
                  fill: ["#3B82F6", "#60A5FA", "#10B981", "#3B82F6"],
                  scale: [1, 1.25, 1.4, 1],
                  opacity: [0.6, 0.9, 1, 0.6],
                }}
                transition={{
                  duration: loopDuration,
                  repeat: Infinity,
                  times: [0, 0.6, 0.85, 1],
                  ease: "easeInOut",
                }}
                filter="url(#qf-blue-glow)"
              />
            ) : (
              <circle cx="16" cy="20" r="4.5" fill="#3B82F6" opacity="0.8" />
            )}

            {/* Center Bell / Counter Desk Star Icon */}
            <circle cx="16" cy="20" r="2" fill="#FFFFFF" opacity="0.9" />

            {/* Arrival Flash / Checkmark Indicator when ticket reaches desk */}
            {!shouldReduceMotion && (
              <motion.g
                animate={{
                  opacity: [0, 0, 0, 1, 0],
                  scale: [0.6, 0.8, 0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: loopDuration,
                  repeat: Infinity,
                  times: [0, 0.65, 0.72, 0.85, 1],
                  ease: "easeOut",
                }}
                style={{ transformOrigin: "16px 2px" }}
              >
                <circle cx="16" cy="-2" r="7" fill="#10B981" filter="url(#qf-arrival-glow)" opacity="0.4" />
                <circle cx="16" cy="-2" r="6" fill="#10B981" />
                <path
                  d="M13.5 -2L15.2 -0.2L18.8 -3.8"
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.g>
            )}
          </g>

          {/* 3. Advancing Queue Tickets */}
          {!shouldReduceMotion ? (
            <>
              {/* Ticket 3 (Trailing): Enters queue from left, fades in */}
              <motion.g
                animate={{
                  x: [trackStartX - 10, trackStartX + (counterX - trackStartX) * 0.28],
                  opacity: [0, 0.85],
                  scale: [0.85, 0.92],
                }}
                transition={{
                  duration: loopDuration,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <rect
                  x={0}
                  y={ticketY}
                  width={sizeConfig.ticketW}
                  height={sizeConfig.ticketH}
                  rx="4"
                  fill="url(#qf-ticket-grad)"
                  stroke="#203052"
                  strokeWidth="1.2"
                />
                {/* Ticket Details (Number notch & lines) */}
                <circle cx="2" cy={ticketY + sizeConfig.ticketH / 2} r="2.5" fill="#050B18" />
                <circle cx={sizeConfig.ticketW - 2} cy={ticketY + sizeConfig.ticketH / 2} r="2.5" fill="#050B18" />
                <line
                  x1="7"
                  y1={ticketY + 6}
                  x2={sizeConfig.ticketW - 7}
                  y2={ticketY + 6}
                  stroke="#576B91"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="7"
                  y1={ticketY + 11}
                  x2={sizeConfig.ticketW - 12}
                  y2={ticketY + 11}
                  stroke="#3B82F6"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </motion.g>

              {/* Ticket 2 (Mid-Queue): Advances from middle to lead position */}
              <motion.g
                animate={{
                  x: [
                    trackStartX + (counterX - trackStartX) * 0.28,
                    trackStartX + (counterX - trackStartX) * 0.58,
                  ],
                  opacity: [0.85, 1],
                  scale: [0.92, 1],
                }}
                transition={{
                  duration: loopDuration,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <rect
                  x={0}
                  y={ticketY}
                  width={sizeConfig.ticketW}
                  height={sizeConfig.ticketH}
                  rx="4"
                  fill="url(#qf-ticket-grad)"
                  stroke="#2D416E"
                  strokeWidth="1.2"
                />
                <circle cx="2" cy={ticketY + sizeConfig.ticketH / 2} r="2.5" fill="#050B18" />
                <circle cx={sizeConfig.ticketW - 2} cy={ticketY + sizeConfig.ticketH / 2} r="2.5" fill="#050B18" />
                <line
                  x1="7"
                  y1={ticketY + 6}
                  x2={sizeConfig.ticketW - 7}
                  y2={ticketY + 6}
                  stroke="#889DC2"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="7"
                  y1={ticketY + 11}
                  x2={sizeConfig.ticketW - 10}
                  y2={ticketY + 11}
                  stroke="#3B82F6"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </motion.g>

              {/* Ticket 1 (Leading Ticket): Advances directly to Counter, receives glow, completes! */}
              <motion.g
                animate={{
                  x: [
                    trackStartX + (counterX - trackStartX) * 0.58,
                    counterX - 22,
                  ],
                  opacity: [1, 1, 1, 0],
                  scale: [1, 1.05, 1.1, 0.95],
                }}
                transition={{
                  duration: loopDuration,
                  repeat: Infinity,
                  times: [0, 0.7, 0.85, 1],
                  ease: "easeInOut",
                }}
              >
                <rect
                  x={0}
                  y={ticketY}
                  width={sizeConfig.ticketW}
                  height={sizeConfig.ticketH}
                  rx="4"
                  fill="url(#qf-active-ticket-grad)"
                  stroke="#60A5FA"
                  strokeWidth="1.5"
                  filter="url(#qf-blue-glow)"
                />
                <circle cx="2" cy={ticketY + sizeConfig.ticketH / 2} r="2.5" fill="#050B18" />
                <circle cx={sizeConfig.ticketW - 2} cy={ticketY + sizeConfig.ticketH / 2} r="2.5" fill="#050B18" />
                <line
                  x1="7"
                  y1={ticketY + 6}
                  x2={sizeConfig.ticketW - 7}
                  y2={ticketY + 6}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="7"
                  y1={ticketY + 11}
                  x2={sizeConfig.ticketW - 11}
                  y2={ticketY + 11}
                  stroke="#93C5FD"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </motion.g>
            </>
          ) : (
            /* Reduced Motion Static Fallback */
            <>
              <g transform={`translate(${trackStartX + 20}, 0)`}>
                <rect
                  x={0}
                  y={ticketY}
                  width={sizeConfig.ticketW}
                  height={sizeConfig.ticketH}
                  rx="4"
                  fill="#101A32"
                  stroke="#203052"
                  strokeWidth="1.2"
                />
              </g>
              <g transform={`translate(${trackStartX + (counterX - trackStartX) * 0.45}, 0)`}>
                <rect
                  x={0}
                  y={ticketY}
                  width={sizeConfig.ticketW}
                  height={sizeConfig.ticketH}
                  rx="4"
                  fill="#152243"
                  stroke="#2D416E"
                  strokeWidth="1.2"
                />
              </g>
              <g transform={`translate(${counterX - 24}, 0)`}>
                <rect
                  x={0}
                  y={ticketY}
                  width={sizeConfig.ticketW}
                  height={sizeConfig.ticketH}
                  rx="4"
                  fill="#2563EB"
                  stroke="#60A5FA"
                  strokeWidth="1.5"
                />
              </g>
            </>
          )}
        </svg>
      </div>

      {/* Contextual Messaging & Accessible Status */}
      {showMessage && (
        <div className="mt-3.5 text-center px-4 max-w-sm">
          <p className={cn("font-bold text-[#ECF2FF] tracking-tight", sizeConfig.msgSize)}>
            {message}
          </p>
          {submessage ? (
            <p className={cn("text-[#889DC2] mt-1 font-normal leading-relaxed", sizeConfig.subSize)}>
              {submessage}
            </p>
          ) : (
            <p className="text-[11px] text-[#576B91] mt-0.5 tracking-wide uppercase font-semibold">
              QueueLess • Live Counter Flow
            </p>
          )}
        </div>
      )}
    </div>
  );

  // Variant Wrappers
  if (variant === "page") {
    return (
      <div className="min-h-screen bg-[#050B18] text-[#ECF2FF] flex flex-col items-center justify-center p-4">
        {/* Top Brand Logo Accent */}
        <div className="mb-6 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Store className="w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tight text-[#ECF2FF]">
            Queue<span className="text-blue-500">Less</span>
          </span>
        </div>

        <div className="bg-[#101A32] border border-[#203052] rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/60 max-w-md w-full flex flex-col items-center">
          {animationContent}
        </div>
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div className="fixed inset-0 z-50 bg-[#050B18]/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-[#101A32] border border-[#203052] rounded-2xl p-6 shadow-2xl max-w-sm w-full flex flex-col items-center">
          {animationContent}
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "w-full rounded-2xl border border-[#203052] bg-[#101A32]/60 backdrop-blur-sm flex flex-col items-center justify-center shadow-lg",
          sizeConfig.containerPadding,
          className
        )}
      >
        {animationContent}
      </div>
    );
  }

  // "inline" variant
  return animationContent;
}
