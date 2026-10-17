"use client"
import React from "react"
import { AlertCircle, RefreshCw, XCircle } from "lucide-react"

interface ErrorBannerProps {
  title?: string
  message: string
  onRetry?: () => void
  isRetrying?: boolean
  className?: string
  onDismiss?: () => void
}

/**
 * Accessible form-level and section-level error feedback banner.
 * Designed with Apple Human Interface Guidelines and WCAG AA contrast.
 */
export function ErrorBanner({
  title = "Something went wrong",
  message,
  onRetry,
  isRetrying = false,
  className = "",
  onDismiss
}: ErrorBannerProps) {
  if (!message) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`relative overflow-hidden rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-foreground backdrop-blur-md dark:border-rose-500/30 dark:bg-rose-950/20 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-300 tracking-tight">
            {title}
          </h4>
          <p className="mt-1 text-xs sm:text-sm text-foreground/80 leading-relaxed break-words">
            {message}
          </p>

          {onRetry && (
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} aria-hidden="true" />
                <span>{isRetrying ? "Retrying..." : "Try again"}</span>
              </button>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-foreground/50 hover:text-foreground p-1 rounded-md transition-colors"
            aria-label="Dismiss alert"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
