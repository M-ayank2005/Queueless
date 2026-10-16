"use client";

import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import QueueFlowInline from "./QueueFlowInline";
import { cn } from "@/lib/utils";

export interface LoadingButtonProps extends ButtonProps {
  /**
   * Whether the button is currently in a pending / loading state
   */
  loading?: boolean;
  /**
   * Optional loading label to display while pending (e.g., "Joining queue...", "Saving changes...")
   */
  loadingText?: string;
  /**
   * Left icon
   */
  icon?: React.ReactNode;
}

/**
 * LoadingButton Component
 * 
 * Production-quality button with integrated QueueFlow micro-loading state.
 * Preserves button geometry, prevents accidental double-submissions,
 * and maintains high contrast accessibility.
 */
export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      children,
      loading = false,
      loadingText,
      disabled,
      className,
      icon,
      variant = "default",
      ...props
    },
    ref
  ) => {
    const inlineColor =
      variant === "outline" || variant === "secondary" || variant === "ghost"
        ? "primary"
        : variant === "success"
        ? "success"
        : "white";

    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        variant={variant}
        className={cn(
          "transition-all relative",
          loading && "cursor-not-allowed opacity-90",
          className
        )}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <QueueFlowInline size="sm" color={inlineColor} />
            <span>{loadingText || children}</span>
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-2">
            {icon && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
          </span>
        )}
      </Button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";
export default LoadingButton;
