"use client"
import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Home, ArrowLeft, LayoutDashboard, Search, HelpCircle } from "lucide-react"

export default function NotFound() {
  const router = useRouter()

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/")
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* Top minimal branding bar */}
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

      {/* Main 404 Hero Container */}
      <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center text-center my-auto">
        {/* Apple-style Frosted Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card/60 backdrop-blur-md shadow-xs text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
          <span>Error 404 • Missing Resource</span>
        </div>

        {/* Large 404 Header */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground">
          This queue doesn&apos;t exist
        </h1>

        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed">
          The page, ticket, or store link you followed may have expired, changed location, or was typed incorrectly.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleGoBack}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted/70 text-foreground font-semibold text-sm transition-all duration-150 active:scale-98 shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Go Back</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm transition-all duration-150 active:scale-98 shadow-md shadow-primary/20 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Return Home</span>
          </Link>

          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted/70 text-foreground font-semibold text-sm transition-all duration-150 active:scale-98 shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Safe Helpful Suggestions */}
        <div className="mt-12 w-full pt-8 border-t border-border/60">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Looking for something else?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <Link
              href="/"
              className="p-3.5 rounded-xl border border-border/80 bg-card/40 hover:bg-card hover:border-primary/40 transition-all duration-150 group"
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  Find Stores & Queues
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 pl-6.5">
                Browse partner locations and join lines remotely.
              </p>
            </Link>

            <Link
              href="/#faq"
              className="p-3.5 rounded-xl border border-border/80 bg-card/40 hover:bg-card hover:border-primary/40 transition-all duration-150 group"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  Help & Support
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 pl-6.5">
                Learn how virtual queues and tickets work.
              </p>
            </Link>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full py-6 text-center text-xs text-muted-foreground">
        QueueLess Virtual Queue Platform • HTTP 404 Resource Not Found
      </footer>
    </div>
  )
}
