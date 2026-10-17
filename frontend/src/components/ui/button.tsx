import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "success"
export type ButtonSize = "default" | "sm" | "lg" | "icon"

const buttonVariants = (variant: ButtonVariant = "default", size: ButtonSize = "default") => {
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-[0.98]"

  const variants: Record<ButtonVariant, string> = {
    default: "bg-primary text-white hover:bg-primary-hover shadow-md shadow-blue-500/20 hover:shadow-blue-500/30",
    destructive: "bg-danger/10 text-danger border border-danger/25 hover:bg-danger/20 hover:border-danger/40 dark:bg-danger/15 dark:text-red-400 dark:border-danger/30",
    outline: "border border-border bg-card hover:bg-muted text-foreground hover:border-primary/50 shadow-xs",
    secondary: "bg-secondary text-secondary-foreground hover:bg-muted border border-border",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
    success: "bg-success/10 text-success border border-success/25 hover:bg-success/20 hover:border-success/40 dark:bg-success/15 dark:text-emerald-400 dark:border-success/30"
  }

  const sizes: Record<ButtonSize, string> = {
    default: "h-11 px-5 py-2.5",
    sm: "h-9 rounded-lg px-3.5 text-xs",
    lg: "h-12 rounded-xl px-8 text-base",
    icon: "h-10 w-10 p-0 rounded-xl"
  }

  return cn(base, variants[variant], sizes[size])
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants(variant, size), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
