"use client"
import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle } from "lucide-react"

interface InlineErrorProps {
  message?: string | null
  className?: string
  id?: string
}

/**
 * Accessible inline input field validation error.
 * Uses role="alert" and aria-live="polite" for screen reader announcements.
 */
export function InlineError({ message, className = "", id }: InlineErrorProps) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          id={id}
          role="alert"
          aria-live="polite"
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={`flex items-center gap-1.5 mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="leading-tight break-words">{message}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
