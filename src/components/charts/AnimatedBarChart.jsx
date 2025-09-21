import React, { useMemo, useEffect, useState } from 'react'
import { useTheme } from '@/providers/ThemeProvider'

export default function AnimatedBarChart({ series = [], width = 320, height = 120, className = '' }) {
  const { tokens } = useTheme()
  const fallback = ['#60A5FA','#34D399','#FBBF24','#F472B6']

  // try to read chart color CSS vars first (theme provider sets these), fallback to tokens or defaults
  const cssChartVars = ['--chart-1','--chart-2','--chart-3','--chart-4','--chart-5']
  const getColor = (i) => {
    try {
      if (typeof window !== 'undefined') {
        const v = getComputedStyle(document.documentElement).getPropertyValue(cssChartVars[i] || '').trim()
        if (v) return v
      }
    } catch (e) {}
    if (tokens && tokens.chartColors && tokens.chartColors[i]) return tokens.chartColors[i]
    return fallback[i % fallback.length]
  }

  const [mounted, setMounted] = useState(false)
  // re-run entrance animation when the series data changes
  const seriesKey = useMemo(() => JSON.stringify((series || []).map(s => ({v: s.value, l: s.label}))), [series])
  useEffect(()=> {
    // play entrance animation: reset then quickly set mounted true to trigger transitions
    setMounted(false)
    const t = setTimeout(()=> setMounted(true), 40)
    return () => clearTimeout(t)
  }, [seriesKey])

  const max = Math.max(1, ...series.map(s => s.value || 0))
  const gap = 8
  const w = Math.max(6, Math.floor((width - gap*(series.length+1)) / series.length))

  // color for labels/axis (use theme var or fallback)
  const labelColor = (typeof window !== 'undefined' && getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground')) || getComputedStyle(document.documentElement).getPropertyValue('--foreground') || '#999'

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ color: labelColor, fontFamily: 'var(--font-sans, Inter, ui-sans-serif, system-ui)' }}>
      {series.map((s, i) => {
        const x = gap + i * (w + gap)
        const h = Math.round(((s.value || 0) / max) * (height - 20))
        const y = height - 12 - h
        const fill = getColor(i)
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h}
              rx={4} fill={fill}
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'center bottom',
                transform: mounted ? 'scaleY(1) translateY(0)' : 'scaleY(0.001) translateY(6px)',
                transition: `transform 700ms cubic-bezier(.2,.9,.2,1) ${i*60}ms, opacity 350ms ease ${i*60}ms`,
                opacity: mounted ? 1 : 0
              }} />
            <text x={x + w/2} y={height - 2} fontSize={10} fill="currentColor" textAnchor="middle">{s.label || ''}</text>
          </g>
        )
      })}
    </svg>
  )
}
