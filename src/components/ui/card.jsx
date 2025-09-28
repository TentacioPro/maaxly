import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, accent, compact = false, children, ...props }) {
  const accentColor = accent ? accent : "var(--border-strong)"

  const style = {
    background: "var(--surface-card)",
    boxShadow: "var(--shadow-soft)",
    borderColor: "var(--border-subtle)",
    backdropFilter: `blur(${"var(--surface-blur)"})`,
    WebkitBackdropFilter: `blur(${"var(--surface-blur)"})`,
    "--card-accent": accentColor,
  }

  return (
    <div
      data-slot="card"
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border bg-card text-card-foreground",
        "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]",
        "before:pointer-events-none before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-gradient-to-r",
        "before:from-transparent before:via-[var(--card-accent)] before:to-transparent",
        compact ? "py-4" : "py-6",
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
}

function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 pt-2 pb-2",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-[1.2rem] font-semibold leading-tight tracking-tight", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 pb-6 pt-2", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-3 border-t border-border/40 px-6 pb-6 pt-4",
        className
      )}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
