import React from 'react'
import { cn } from '@/lib/utils'

const STAGES = ['applied','screening','interview','offer']

export default function OpportunityMiniTracker({ status, className }) {
  const currentIndex = Math.max(0, STAGES.indexOf(status))
  return (
    <div className={cn('w-full', className)}>
      <div className="relative flex items-center justify-between px-1">
        <div className="absolute left-0 right-0 h-px bg-muted top-1/2 -translate-y-1/2" />
        {STAGES.map((s, i) => {
          const reached = currentIndex >= i
          return (
            <div key={s} className="flex flex-col items-center justify-center gap-1 min-w-0">
              <div className={cn(
                'relative z-10 h-2.5 w-2.5 rounded-full border',
                reached ? 'bg-primary border-primary' : 'bg-card border-border'
              )} />
              <div className="text-[9px] leading-3 text-muted-foreground uppercase tracking-wide select-none">
                {s.slice(0,3)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
