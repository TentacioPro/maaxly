import React from 'react'
import { cn } from '@/lib/utils'

export function SidebarGroup({ title, children, className }) {
  return (
    <div className={cn('px-2 py-2', className)}>
      {title ? (
        <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">{title}</div>
      ) : null}
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export function SidebarItem({ href, active, children, onClick, icon: Icon }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors',
        active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
      )}
    >
      {Icon ? <Icon className="size-4" /> : null}
      <span className="truncate">{children}</span>
    </a>
  )
}

export function SidebarAction({ children, onClick, icon: Icon, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors',
        active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
      )}
    >
      {Icon ? <Icon className="size-4" /> : null}
      <span className="truncate">{children}</span>
    </button>
  )
}
