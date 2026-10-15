import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "success"
export type ButtonSize = "default" | "sm" | "lg" | "icon"

const buttonVariants = (variant: ButtonVariant = "default", size: ButtonSize = "default") => {
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050B18] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-[0.98]"

  const variants: Record<ButtonVariant, string> = {
    default: "bg-[#2563eb] text-white hover:bg-[#3b82f6] shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30",
    destructive: "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 hover:border-red-500/50",
    outline: "border border-[#203052] bg-[#0a1329]/50 hover:bg-[#152243] text-[#ecf2ff] hover:border-[#3b82f6]/50",
    secondary: "bg-[#152243] text-[#ecf2ff] hover:bg-[#1b2a52] border border-[#203052]",
    ghost: "text-[#c5d5f5] hover:bg-[#152243] hover:text-[#ecf2ff]",
    link: "text-[#38bdf8] underline-offset-4 hover:underline p-0 h-auto",
    success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-500/50"
  }

  const sizes: Record<ButtonSize, string> = {
    default: "h-11 px-5 py-2.5",
    sm: "h-9 rounded-lg px-3.5 text-xs",
    lg: "h-13 rounded-xl px-8 text-base",
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
