import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { controlHeight, fontSizes, radius, spacing } from "@/lib/sizes"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "has-[>svg]:px-3",
        xs: "has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "has-[>svg]:px-2.5",
        lg: "has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  style,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  const sizeStyles =
    size === "xs"
      ? { height: controlHeight.xs, gap: spacing[1], paddingLeft: spacing[2], paddingRight: spacing[2], fontSize: fontSizes.xs }
      : size === "sm"
        ? { height: controlHeight.sm, gap: spacing[1.5], paddingLeft: spacing[3], paddingRight: spacing[2.5], fontSize: fontSizes.sm }
        : size === "lg"
          ? { height: controlHeight.lg, gap: spacing[2], paddingLeft: spacing[6], paddingRight: spacing[6], fontSize: fontSizes.sm }
          : size === "icon" || size === "icon-xs" || size === "icon-sm" || size === "icon-lg"
            ? {}
            : { height: controlHeight.default, gap: spacing[2], paddingLeft: spacing[4], paddingRight: spacing[3], paddingTop: spacing[2], paddingBottom: spacing[2], fontSize: fontSizes.sm }

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      style={{ borderRadius: radius, ...sizeStyles, ...style }}
      {...props}
    />
  )
}

export { Button, buttonVariants }
