"use client"
import React, { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error securely to client telemetry
    console.error("[QueueLess Route Error Boundary]", {
      message: error?.message,
      digest: error?.digest,
      timestamp: new Date().toISOString()
    })
  }, [error])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-rose-500/20 selection:text-rose-600">
      {/* Top Branding Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-200">
            Q
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">
            Queue<span className="text-primary font-black">Less</span>
          </span>
        </Link>
      </header>

      {/* Main Error Hero Card */}
      <main className="w-full max-w-xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center text-center my-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-6 shadow-sm">
          <AlertTriangle className="w-8 h-8" aria-hidden="true" />
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-rose-500/20 bg-rose-500/5 text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-4">
          <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Application Notice</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Something went wrong
        </h1>

        <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-md">
          We encountered an unexpected error while preparing this view. Your queue positions and data remain safe.
        </p>

        {/* Error Reference (Safe Digest without leaking stack trace) */}
        {error?.digest && (
          <div className="mt-4 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs font-mono text-muted-foreground">
            Reference ID: <span className="text-foreground font-semibold">{error.digest}</span>
          </div>
        )}

        {/* Recovery Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm transition-all duration-150 active:scale-98 shadow-md shadow-primary/20 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted/70 text-foreground font-semibold text-sm transition-all duration-150 active:scale-98 shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Return to Home</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-muted-foreground">
        QueueLess Reliability Layer • Secure Exception Boundary
      </footer>
    </div>
  )
}
