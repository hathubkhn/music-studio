import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-teal-500 text-background hover:bg-teal-400",
        secondary: "border-transparent bg-secondary text-muted-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-red-500/20 text-red-400 border-red-500/30",
        outline: "border-border/60 text-muted-foreground bg-transparent",
        success: "border-teal-500/30 bg-teal-500/15 text-teal-400",
        warning: "border-amber-500/30 bg-amber-500/15 text-amber-400",
        info: "border-sky-500/30 bg-sky-500/15 text-sky-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
