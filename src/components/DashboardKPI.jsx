import React from 'react'
import { Card, CardContent } from './ui/card'
import { useTheme } from '@/providers/ThemeProvider'
import { cn } from '@/lib/utils'

export default function DashboardKPI({ label, value, hint, accent = 'primary', onClick, disabled }) {
  const { tokens } = useTheme()

  // derive a foreground color for the value from tokens if available
  const valueStyle = tokens?.accentForeground ? { color: tokens.accentForeground } : undefined
  const interactive = typeof onClick === 'function' && !disabled

  const displayValue = React.useMemo(() => {
    if (value === null || value === undefined || value === '') return '—'
    if (typeof value === 'number' && Number.isFinite(value)) {
      return new Intl.NumberFormat().format(value)
    }
    return value
  }, [value])

  function handleKeyDown(event) {
    if (!interactive) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick(event)
    }
  }

  return (
    <Card
      compact
      className={cn(
        'relative overflow-hidden transition-shadow',
        interactive && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--card-accent)] hover:shadow-lg'
      )}
      accent={accent}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={handleKeyDown}
    >
      {/* left accent stripe */}
      <div className="absolute left-0 top-0 h-full w-1 bg-[color:var(--card-accent)]/90" aria-hidden />

      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-semibold mt-1" style={valueStyle}>{displayValue}</div>
            {hint ? <div className="text-sm text-muted-foreground mt-1">{hint}</div> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
