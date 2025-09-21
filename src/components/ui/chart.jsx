
import React from 'react'
import * as Recharts from 'recharts'
import { cn } from '@/lib/utils'

// Chart context to share series config across primitives
const ChartContext = React.createContext(null)

function useChart() {
  const ctx = React.useContext(ChartContext)
  if (!ctx) throw new Error('useChart must be used within a <ChartContainer />')
  return ctx
}

// Themes mapping for CSS injection
const THEMES = { light: '', dark: '.dark' }

/**
 * ChartContainer
 * - Wraps a responsive recharts container and injects theme-aware CSS variables for series
 * Props: { id, className, config, children }
 */
export const ChartContainer = React.forwardRef(({ id, className, children, config = {}, ...props }, ref) => {
  const unique = React.useId ? React.useId() : String(Math.random()).slice(2)
  const chartId = `chart-${id || unique.replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div data-chart={chartId} ref={ref} className={cn('flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke="#ccc"]]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke="#fff"]]:stroke-transparent [&_.recharts-layer]:outline-hidden', className)} {...props}>
        <ChartStyle id={chartId} config={config} />
        <Recharts.ResponsiveContainer>
          {children}
        </Recharts.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = 'ChartContainer'

/**
 * ChartStyle
 * - Injects CSS variables for configured series colors. Config shape: { key: { color?, theme? } }
 */
export function ChartStyle({ id, config = {} }) {
  const colorConfig = Object.entries(config).filter(([_, v]) => v && (v.theme || v.color))
  if (!colorConfig.length) return null

  const css = Object.entries(THEMES).map(([theme, prefix]) => {
    const inner = colorConfig.map(([key, item]) => {
      const color = item.theme ? item.theme[theme] : item.color
      return color ? `  --color-${key}: ${color};` : null
    }).filter(Boolean).join('\n')
    return `${prefix} [data-chart=${id}] {\n${inner}\n}`
  }).join('\n')

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}

// Helper: extract payload config for tooltip/legend mapping
function getPayloadConfigFromPayload(config, payload, key) {
  if (!payload || typeof payload !== 'object') return undefined
  const payloadPayload = payload.payload && typeof payload.payload === 'object' ? payload.payload : undefined

  let configLabelKey = key
  if (key in payload && typeof payload[key] === 'string') configLabelKey = payload[key]
  else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key] === 'string') configLabelKey = payloadPayload[key]

  return configLabelKey in config ? config[configLabelKey] : config[key]
}

/**
 * ChartTooltipContent
 * - Reusable tooltip content styled to match tweakcn look
 * - Accepts the Recharts Tooltip renderer props: { active, payload, label, ... }
 */
export const ChartTooltipContent = React.forwardRef(({ active, payload, className, hideLabel = false, hideIndicator = false, indicator = 'dot', label, labelFormatter, labelClassName, formatter, color, nameKey, labelKey }, ref) => {
  const { config } = useChart()
  if (!active || !payload || !payload.length) return null

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload.length) return null
    const item = payload[0]
    const key = `${labelKey || item.dataKey || item.name || 'value'}`
    // find label from config
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value = itemConfig?.label || (!labelKey && typeof label === 'string' ? label : undefined)
    if (labelFormatter) return <div className={cn('font-medium', labelClassName)}>{labelFormatter(value, payload)}</div>
    if (!value) return null
    return <div className={cn('font-medium', labelClassName)}>{value}</div>
  }, [hideLabel, payload, label, labelFormatter, labelClassName, labelKey, config])

  return (
    <div ref={ref} className={cn('grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl', className)}>
      {!Array.isArray(payload) ? null : (
        <div className="grid gap-1.5">
          {!hideLabel ? tooltipLabel : null}
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || 'value'}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            const indicatorColor = color || (item.payload && item.payload.fill) || item.color || (itemConfig && (itemConfig.theme ? itemConfig.theme.dark || itemConfig.theme.light : itemConfig.color))

            return (
              <div key={index} className={cn('flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground', indicator === 'dot' && 'items-center')}>
                {!hideIndicator && (
                  <div style={{ backgroundColor: indicatorColor }} className="shrink-0 rounded-[2px] h-2.5 w-2.5" />
                )}
                <div className="flex flex-1 justify-between leading-none items-center">
                  <div className="grid gap-1.5">
                    <span className="text-muted-foreground">{itemConfig?.label || item.name}</span>
                  </div>
                  {item.value !== undefined && (
                    <span className="font-mono font-medium tabular-nums text-foreground">{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})
ChartTooltipContent.displayName = 'ChartTooltipContent'

export const ChartTooltip = Recharts.Tooltip
export const ChartLegend = Recharts.Legend

/**
 * ChartLegendContent
 * - Custom legend renderer for Recharts payload
 */
export const ChartLegendContent = React.forwardRef(({ className, hideIcon = false, payload = [], verticalAlign = 'bottom', nameKey }, ref) => {
  const { config } = useChart()
  if (!payload || !payload.length) return null
  return (
    <div ref={ref} className={cn('flex items-center justify-center gap-4', verticalAlign === 'top' ? 'pb-3' : 'pt-3', className)}>
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || 'value'}`
        const itemConfig = getPayloadConfigFromPayload(config, item, key)
        const label = itemConfig?.label || (item.payload && item.payload[key]) || item.value
        const color = item.color || (itemConfig && (itemConfig.theme ? itemConfig.theme.light : itemConfig.color))

        return (
          <div key={label} className="flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground">
            {!hideIcon ? (
              <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
            ) : null}
            <span>{label}</span>
          </div>
        )
      })}
    </div>
  )
})
ChartLegendContent.displayName = 'ChartLegendContent'

export default ChartContainer
