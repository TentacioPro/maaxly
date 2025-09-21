import React, { useMemo } from 'react'
import { useTheme } from '@/providers/ThemeProvider'

// Simple stacked bar chart for small multiples. No external deps.
export default function StatsChart({ series = [], height = 120 }) {
  const { tokens } = useTheme()

  // group by date and role
  const { byDate, roles, max } = useMemo(() => {
    const map = new Map()
    const rolesSet = new Set()
    for (const item of series || []) {
      const d = item._id?.d || item.date || ''
      const role = item._id?.role || item.role || 'guest'
      rolesSet.add(role)
      if (!map.has(d)) map.set(d, {})
      const obj = map.get(d)
      obj[role] = (obj[role] || 0) + (item.count || 0)
    }
    const sorted = Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0]))
    const rolesArr = Array.from(rolesSet).sort()
    const maxVal = Math.max(1, ...sorted.flatMap(([,v]) => rolesArr.map(r => v[r] || 0)))
    return { byDate: sorted, roles: rolesArr, max: maxVal }
  }, [series])

  const colors = (tokens && tokens.chartColors) || ['#60A5FA','#34D399','#FBBF24','#F472B6']

  if (byDate.length === 0) return <div className="text-sm text-muted-foreground">No data.</div>

  const barWidth = Math.max(6, Math.floor(800 / byDate.length))
  const svgWidth = Math.max(200, byDate.length * barWidth)

  return (
    <div className="overflow-x-auto">
      <svg width={svgWidth} height={height} viewBox={`0 0 ${svgWidth} ${height}`}>
        {byDate.map(([date, counts], i) => {
          let x = i * barWidth + 8
          let y = height - 16
          const total = (Object.values(counts).reduce((s,n)=>s+(n||0),0)) || 0
          // draw stacked rects from bottom
          let offset = 0
          return (
            <g key={date}>
              { (roles.length ? roles : ['guest']).map((role, rIdx) => {
                const val = counts[role] || 0
                const h = Math.round((val / (max || 1)) * (height - 36))
                const rect = (
                  <rect key={role}
                    x={x}
                    y={y - offset - h}
                    width={barWidth - 6}
                    height={h}
                    rx={3}
                    fill={colors[rIdx % colors.length]}
                    opacity={0.95}
                  />
                )
                offset += h
                return rect
              })}
              <text x={x + (barWidth-6)/2} y={height-4} fontSize={10} fill="#666" textAnchor="middle">{date}</text>
            </g>
          )
        })}
      </svg>
      {/* legend */}
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        { ( (tokens && tokens.chartLegend) || ['guest','student','employer','admin']).slice(0,4).map((n, i) => (
          <div key={n} className="flex items-center gap-2">
            <span style={{ width:12, height:12, background: colors[i%colors.length], display:'inline-block', borderRadius:3 }} aria-hidden></span>
            <span className="capitalize">{n}</span>
          </div>
        )) }
      </div>
    </div>
  )
}
