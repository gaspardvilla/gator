import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { fontSizes, radius, spacing } from "@/lib/sizes"

const alertVariants = cva(
  "relative w-full border grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  style,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      style={{ 
        borderRadius: radius.outer, 
        paddingLeft: spacing[4], 
        paddingRight: spacing[4], 
        paddingTop: spacing[3], 
        paddingBottom: spacing[3], 
        fontSize: fontSizes.sm, 
        gap: spacing[0.5], 
        ...style }}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-muted-foreground col-start-2 grid justify-items-start [&_p]:leading-relaxed", className)}
      style={{ gap: spacing[1], fontSize: fontSizes.sm, ...style }}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
