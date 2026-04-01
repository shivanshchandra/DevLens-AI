import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-white/10 bg-white/10 text-white",
        secondary:
          "border-blue-500/20 bg-blue-500/10 text-blue-300",
        destructive:
          "border-red-500/20 bg-red-500/10 text-red-300",
        outline:
          "border-white/10 bg-white/[0.03] text-zinc-300",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
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