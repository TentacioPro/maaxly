import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/75 selection:bg-primary selection:text-primary-foreground",
        "flex h-11 w-full min-w-0 rounded-2xl border border-border/50 bg-transparent px-4 text-sm font-medium text-foreground shadow-sm transition-all duration-200",
        "backdrop-blur-xl",
        "focus-visible:border-primary/70 focus-visible:ring-4 focus-visible:ring-primary/15",
        "hover:border-border",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive/80",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      style={{
        background: 'var(--surface-input)',
        boxShadow: 'var(--shadow-input)',
      }}
      {...props} />
  );
}

function Label({ className, ...props }) {
  return (
    <label
  className={cn("block text-sm font-medium leading-none mb-2", className)}
      {...props}
    />
  )
}

export { Input, Label }
