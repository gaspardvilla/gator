"use client"

import * as React from "react"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { controlHeight, fontSizes, radius, spacing } from "@/lib/sizes"

function Input({ className, style, type, onChange, value, min, max, step = 1, ...props }: React.ComponentProps<"input">) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleStep = (delta: number) => {
    const el = inputRef.current
    if (!el || type !== "number") return
    const current = typeof value !== "undefined" ? Number(value) : Number(el.value) || 0
    const stepNum = Number(step) || 1
    const minNum = min !== undefined ? Number(min) : -Infinity
    const maxNum = max !== undefined ? Number(max) : Infinity
    const next = Math.min(maxNum, Math.max(minNum, current + delta * stepNum))
    el.value = String(next)
    onChange?.({
      target: el,
    } as React.ChangeEvent<HTMLInputElement>)
  }

  const inputEl = (
    <input
      ref={inputRef}
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 border bg-background text-foreground shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        type === "number" && "flex-1 min-w-0 w-0 border-0 rounded-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className
      )}
      style={{
        borderColor: "var(--foreground)",
        fontSize: fontSizes.sm,
        height: controlHeight.default,
        paddingLeft: spacing[2],
        paddingRight: spacing[1],
        paddingTop: spacing[2],
        paddingBottom: spacing[2],
        ...(type !== "number" ? { borderWidth: "1px", borderStyle: "solid", borderRadius: radius.inner } : {}),
        ...(type === "number" ? {} : style),
      }}
      onChange={onChange}
      value={value}
      min={min}
      max={max}
      step={step}
      {...props}
    />
  )

  if (type === "number") {
    return (
      <div
        className="flex w-full min-w-0 items-stretch overflow-hidden"
        style={{
          borderColor: "var(--foreground)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderRadius: radius.inner,
          ...style,
        }}
      >
        {inputEl}
        <div className="flex flex-col shrink-0">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Increment"
            className="flex flex-1 items-center justify-center border-l border-transparent bg-background text-foreground transition-colors hover:bg-card"
            style={{
              width: "18px",
              minHeight: 0,
              borderTopRightRadius: radius.inner,
            }}
            onClick={() => handleStep(1)}
          >
            <ChevronUpIcon className="size-3.5" style={{ color: "var(--foreground)" }} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Decrement"
            className="flex flex-1 items-center justify-center border-l border-t border-transparent bg-background text-foreground transition-colors hover:bg-card"
            style={{
              width: "18px",
              minHeight: 0,
              borderBottomRightRadius: radius.inner,
            }}
            onClick={() => handleStep(-1)}
          >
            <ChevronDownIcon className="size-3.5" style={{ color: "var(--foreground)" }} />
          </button>
        </div>
      </div>
    )
  }

  return inputEl
}

export { Input }
