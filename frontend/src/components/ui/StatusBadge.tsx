import React from "react"
import { cn } from "@/lib/utils"

export type QueueStatus = "waiting" | "in_progress" | "completed" | "cancelled" | string

interface StatusBadgeProps {
  status: QueueStatus
  className?: string
  showDot?: boolean
}

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  waiting: {
    label: "In Queue",
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-500/30",
    dot: "bg-amber-500 dark:bg-amber-400"
  },
  in_progress: {
    label: "Being Served",
    bg: "bg-blue-500/10 dark:bg-cyan-500/15",
    text: "text-blue-800 dark:text-cyan-300",
    border: "border-blue-500/30 dark:border-cyan-500/30",
    dot: "bg-blue-600 dark:bg-cyan-400"
  },
  completed: {
    label: "Completed",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-800 dark:text-emerald-300",
    border: "border-emerald-500/30",
    dot: "bg-emerald-600 dark:bg-emerald-400"
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    text: "text-rose-800 dark:text-rose-300",
    border: "border-rose-500/30",
    dot: "bg-rose-600 dark:bg-rose-400"
  }
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const norm = status?.toLowerCase() || "waiting"
  const conf = statusConfig[norm] || {
    label: status || "Unknown",
    bg: "bg-slate-500/10 dark:bg-slate-800/50",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-slate-700",
    dot: "bg-slate-500 dark:bg-slate-400"
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border backdrop-blur-sm",
        conf.bg,
        conf.text,
        conf.border,
        className
      )}
    >
      {showDot && (
        <span className="relative flex h-2 w-2">
          {norm === "in_progress" && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 dark:bg-cyan-400 opacity-75" />
          )}
          <span className={cn("relative inline-flex rounded-full h-2 w-2", conf.dot)} />
        </span>
      )}
      {conf.label}
    </span>
  )
}

export default StatusBadge;
