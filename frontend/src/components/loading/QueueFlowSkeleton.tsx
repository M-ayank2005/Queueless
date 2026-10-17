"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base shimmering skeleton block built using QueueLess theme tokens.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-lg bg-muted/80 border border-border/40 relative overflow-hidden",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.04] before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

/**
 * Skeleton for Customer Dashboard active queue cards
 */
export function QueueCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading queue tickets"
      className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2.5 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="h-6 w-56 rounded-md mt-1" />
        </div>

        <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-xl mt-2" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Merchant Dashboard current customer queue list items
 */
export function DashboardQueueSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading live queue items"
      className="space-y-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-40 rounded" />
            <Skeleton className="h-3.5 w-52 rounded" />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Store Front Menu & Services list
 */
export function StoreMenuSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading store information"
      className="space-y-6"
    >
      {/* Store Header Banner Skeleton */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3 shadow-xs">
        <Skeleton className="h-8 w-60 rounded-lg" />
        <Skeleton className="h-4 w-44 rounded-md" />
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
      </div>

      {/* Services List Skeleton */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xs">
        <Skeleton className="h-6 w-36 rounded-md" />
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl border border-border bg-secondary/50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-14 rounded" />
            </div>
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-xl mt-4" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Booking History list
 */
export function HistorySkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading booking history"
      className="space-y-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-44 rounded" />
          </div>
          <Skeleton className="h-4 w-24 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Profile & Account Details
 */
export function ProfileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading profile details"
      className="space-y-6 max-w-2xl mx-auto"
    >
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-40 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xs">
        <Skeleton className="h-5 w-32 rounded" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-11 w-32 rounded-xl mt-2" />
      </div>
    </div>
  );
}
