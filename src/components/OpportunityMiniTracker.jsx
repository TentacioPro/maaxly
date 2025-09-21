import React from 'react'
import { cn } from '@/lib/utils'

const STAGES = ['applied','screening','interview','offer']

export default function OpportunityMiniTracker({ status, className }) {
  const currentIndex = STAGES.indexOf(status)
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {STAGES.map((s,i) => {
        const reached = currentIndex >= i
        return (
          <div key={s} className="flex-1">
            <div className={cn('h-1 rounded bg-muted overflow-hidden relative', reached && 'bg-primary/40')}>
              <div className={cn('absolute inset-y-0 left-0 bg-primary transition-all', reached ? 'w-full' : 'w-0')} />
            </div>
            <div className="text-[9px] leading-3 mt-1 text-center uppercase tracking-wide text-muted-foreground select-none">
              {s.slice(0,3)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
