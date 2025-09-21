import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { cn } from '@/lib/utils'

// Map accent keys to safe Tailwind classes (must be enumerated for JIT)
const ACCENT_STYLES = {
  primary: 'border-l-4 pl-2 border-primary',
  secondary: 'border-l-4 pl-2 border-secondary',
  accent: 'border-l-4 pl-2 border-accent',
  success: 'border-l-4 pl-2 border-emerald-500 dark:border-emerald-400',
  warning: 'border-l-4 pl-2 border-amber-500 dark:border-amber-400',
  danger: 'border-l-4 pl-2 border-red-500 dark:border-red-400'
}

export default function MetricCard({ label, value, hint, accent }) {
  const accentClass = accent && ACCENT_STYLES[accent] ? ACCENT_STYLES[accent] : ''
  return (
    <Card className={cn(accentClass)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-semibold tracking-tight">{value ?? '—'}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  )
}
