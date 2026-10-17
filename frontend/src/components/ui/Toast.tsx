"use client"
import React, { createContext, useContext, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"

type ToastType = "success" | "error" | "info"

interface ToastItem {
  id: string
  message: string
  type: ToastType
  timestamp: number
}

interface ToastContextValue {
  toast: {
    success: (msg: string) => void
    error: (msg: string) => void
    info: (msg: string) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const recentToastsRef = useRef<Map<string, number>>(new Map())

  const addToast = useCallback((message: string, type: ToastType) => {
    if (!message || typeof message !== "string") return;

    // Deduplication check: prevent duplicate spam within a 2.5-second window
    const now = Date.now()
    const key = `${type}:${message.trim()}`
    const lastSeen = recentToastsRef.current.get(key)
    if (lastSeen && now - lastSeen < 2500) {
      return // skip identical duplicate toast
    }
    recentToastsRef.current.set(key, now)

    // Clean up stale cache keys
    if (recentToastsRef.current.size > 20) {
      recentToastsRef.current.forEach((time, k) => {
        if (now - time > 10000) recentToastsRef.current.delete(k)
      })
    }

    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type, timestamp: now }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toastMethods = {
    success: (msg: string) => addToast(msg, "success"),
    error: (msg: string) => addToast(msg, "error"),
    info: (msg: string) => addToast(msg, "info"),
  }

  return (
    <ToastContext.Provider value={{ toast: toastMethods }}>
      {children}
      <div 
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              aria-live={t.type === "error" ? "assertive" : "polite"}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-xl bg-card/95 text-foreground"
              style={{
                borderColor:
                  t.type === "success"
                    ? "var(--color-success, #10b981)"
                    : t.type === "error"
                    ? "var(--color-danger, #ef4444)"
                    : "var(--color-primary, #3b82f6)",
              }}
            >
              {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />}
              {t.type === "error" && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" aria-hidden="true" />}
              {t.type === "info" && <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" aria-hidden="true" />}
              <div className="flex-1 text-sm font-medium leading-snug break-words">{t.message}</div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return {
      toast: {
        success: (msg: string) => console.log("[Success]", msg),
        error: (msg: string) => console.error("[Error]", msg),
        info: (msg: string) => console.log("[Info]", msg),
      },
    }
  }
  return ctx
}
