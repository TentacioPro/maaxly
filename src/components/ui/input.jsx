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
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border border-border bg-input/80 text-foreground flex h-10 w-full min-w-0 rounded-md px-3 py-2 text-sm shadow-sm transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  "[&:not(:placeholder-shown)]:leading-normal",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
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
