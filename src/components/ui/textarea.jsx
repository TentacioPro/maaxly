import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground",
        "flex min-h-[110px] w-full rounded-2xl border border-border/50 bg-transparent px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-all duration-200",
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
      {...props}
    />
  )
})

Textarea.displayName = 'Textarea'

export { Textarea }
