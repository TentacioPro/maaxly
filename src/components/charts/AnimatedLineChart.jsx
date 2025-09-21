import React from 'react'
import { ResponsiveContainer, AreaChart, Area, Line, Tooltip, XAxis, YAxis } from 'recharts'
import { useTheme } from '@/providers/ThemeProvider'

// Recharts-based line chart similar to tweakcn: gradient line, subtle fill, responsive and themed
export default function AnimatedLineChart({ points = [], dataKey = 'value', xKey = 'name', className = '', height = 80 }) {
  const { tokens } = useTheme()

  const stroke = (typeof window !== 'undefined' && getComputedStyle(document.documentElement).getPropertyValue('--chart-1')) || (tokens && tokens.chartColors && tokens.chartColors[0]) || '#60A5FA'
  const fill = stroke

  // normalize simple numeric arrays into objects
  const data = Array.isArray(points) && points.length && typeof points[0] === 'object'
    ? points
    : (points || []).map((v, i) => ({ [xKey]: i, [dataKey]: v }))

  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity={0.12} />
              <stop offset="100%" stopColor={fill} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" x2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.95} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <XAxis dataKey={xKey} hide />
          <YAxis hide />
          <Tooltip wrapperStyle={{ outline: 'none' }} contentStyle={{ border: '1px solid var(--border)', background: 'var(--background)' }} />
          <Area type="monotone" dataKey={dataKey} stroke="none" fill="url(#areaGrad)" isAnimationActive animationDuration={800} />
          <Line type="monotone" dataKey={dataKey} stroke="url(#lineGrad)" strokeWidth={2} dot={{ r: 2 }} isAnimationActive animationDuration={900} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
