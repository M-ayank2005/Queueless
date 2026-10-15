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
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-400"
  },
  in_progress: {
    label: "Being Served",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    dot: "bg-cyan-400 animate-ping"
  },
  completed: {
    label: "Completed",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400"
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
    dot: "bg-rose-400"
  }
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const norm = status?.toLowerCase() || "waiting"
  const conf = statusConfig[norm] || {
    label: status || "Unknown",
    bg: "bg-zinc-800/50",
    text: "text-zinc-300",
    border: "border-zinc-700",
    dot: "bg-zinc-400"
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
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          )}
          <span className={cn("relative inline-flex rounded-full h-2 w-2", conf.dot)} />
        </span>
      )}
      {conf.label}
    </span>
  )
}

export default StatusBadge;

