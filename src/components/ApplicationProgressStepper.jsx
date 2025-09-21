import React from 'react'
import { cn } from '@/lib/utils'

// Simple horizontal stepper based on numeric counts
// stages: Applied -> Interview -> Offer
export default function ApplicationProgressStepper({ applications=0, interviews=0, offers=0 }) {
  const stages = [
    { key: 'applied', label: 'Applied', value: applications },
    { key: 'interview', label: 'Interview', value: interviews },
    { key: 'offer', label: 'Offer', value: offers },
  ]
  const total = applications || interviews || offers ? Math.max(applications, interviews, offers) : 0
  return (
    <div className="w-full">
      <div className="flex items-stretch justify-between gap-4">
        {stages.map((s, i) => {
          const pct = total ? Math.min(100, Math.round((s.value / total) * 100)) : 0
          return (
            <div key={s.key} className="flex-1 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{s.label}</span>
                <span>{s.value}</span>
              </div>
              <div className="h-2 rounded bg-muted overflow-hidden">
                <div className={cn('h-full bg-primary transition-all duration-500')} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground uppercase tracking-wide">Application Journey</div>
    </div>
  )
}
