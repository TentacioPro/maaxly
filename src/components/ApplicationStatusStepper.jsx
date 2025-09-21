import React from 'react'
import { cn } from '@/lib/utils'

// Visualizes a single application's status across ordered stages
// stages: applied -> screening -> interview -> offer (rejected handled separately)
export default function ApplicationStatusStepper({ status='applied', compact=false }) {
  const stages = ['applied','screening','interview','offer']
  const currentIndex = stages.indexOf(status === 'rejected' ? 'applied' : status)

  return (
    <div className={cn('w-full flex flex-col gap-2', compact && 'gap-1')}>      
      <div className="flex items-center justify-between gap-2">
        {stages.map((st, i) => {
          const active = i <= currentIndex && status !== 'rejected'
          return (
            <div key={st} className="flex-1 flex items-center last:flex-none">
              <div className={cn('h-2 w-full rounded transition-colors', active ? 'bg-primary' : 'bg-muted')} />
              {i < stages.length - 1 && <div className="w-2" />}
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {stages.map(s => <span key={s}>{s.replace(/^(.)/, c=>c.toUpperCase()).replace('Applied','Applied')}</span>)}
      </div>
      {status === 'rejected' && (
        <div className="text-[10px] text-destructive">Application rejected</div>
      )}
    </div>
  )
}
