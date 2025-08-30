import * as React from 'react'

export function Tooltip({ content, children }) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover text-popover-foreground text-xs px-2 py-1 opacity-0 pointer-events-none shadow-sm transition-opacity duration-150 group-hover:opacity-100">
        {content}
      </span>
    </span>
  )
}

export default Tooltip
