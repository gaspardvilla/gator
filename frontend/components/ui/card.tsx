import * as React from "react"

import { cn } from "@/lib/utils"
import { fontSizes, radius, spacing } from "@/lib/sizes"

function Card({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col border shadow-sm",
        className
      )}
      style={{ 
        gap: spacing[6], 
        borderRadius: radius.outer, 
        borderColor: "var(--foreground)",
        paddingTop: spacing[6], 
        paddingBottom: spacing[6], 
        ...style }}
      {...props}
    />
  )
}

function CardHeader({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      style={{ gap: spacing[2], paddingLeft: spacing[6], paddingRight: spacing[6], ...style }}
      {...props}
    />
  )
}

function CardTitle({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      style={{ fontSize: fontSizes.base, ...style }}
      {...props}
    />
  )
}

function CardDescription({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground", className)}
      style={{ fontSize: fontSizes.sm, ...style }}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(className)}
      style={{ paddingLeft: spacing[6], paddingRight: spacing[6], ...style }}
      {...props}
    />
  )
}

function CardFooter({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center [.border-t]:pt-6", className)}
      style={{ paddingLeft: spacing[6], paddingRight: spacing[6], ...style }}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
