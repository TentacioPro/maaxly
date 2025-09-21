import React from 'react'
import { Card, CardContent } from './ui/card'
import { useTheme } from '@/providers/ThemeProvider'
import { cn } from '@/lib/utils'

export default function DashboardKPI({ label, value, hint, accent = 'primary' }) {
  const { tokens } = useTheme()

  // derive a foreground color for the value from tokens if available
  const valueColor = tokens?.accentForeground || 'text-foreground'

  return (
    <Card compact className="relative overflow-hidden" accent={accent}>
      {/* left accent stripe */}
      <div className="absolute left-0 top-0 h-full w-1 bg-[color:var(--card-accent)]/90" aria-hidden />

      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={cn("text-2xl font-semibold mt-1", valueColor)}>{value}</div>
            {hint ? <div className="text-sm text-muted-foreground mt-1">{hint}</div> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
