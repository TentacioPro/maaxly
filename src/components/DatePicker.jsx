import React, { useEffect, useMemo, useState } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './ui/button'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'
import { Input } from './ui/input'
import { cn } from '@/lib/utils'

// Helpers
function pad(n) { return n < 10 ? `0${n}` : `${n}` }
function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function fromISO(s) { if (!s) return null; const t = s.split('-'); if (t.length !== 3) return null; return new Date(Number(t[0]), Number(t[1]) - 1, Number(t[2])) }
function formatDisplay(d) { return d ? d.toLocaleDateString() : '' }
function clampToMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate() }

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  min, // ISO string optional
  max, // ISO string optional
  disablePast = false,
  disableFuture = false,
  disabledDates = [], // array of ISO strings
  className,
  contentClassName,
  size = 'md', // 'md' | 'sm'
  appearance = 'button', // 'button' | 'input'
}) {
  const [open, setOpen] = useState(false)
  const selected = fromISO(value)
  const [focused, setFocused] = useState(() => selected || new Date())
  const [viewMonth, setViewMonth] = useState(() => clampToMonth(focused))

  // Derived constraints
  const minDate = useMemo(() => fromISO(min), [min])
  const maxDate = useMemo(() => fromISO(max), [max])
  const disabledSet = useMemo(() => new Set(disabledDates || []), [disabledDates])
  const today = useMemo(() => {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), t.getDate())
  }, [])

  // Sync focused/view month when value changes or dialog opens
  useEffect(() => {
    if (selected) {
      setFocused(selected)
      setViewMonth(clampToMonth(selected))
    }
  }, [value])

  useEffect(() => {
    if (open) {
      const base = selected || today
      setFocused(base)
      setViewMonth(clampToMonth(base))
    }
  }, [open])

  const isSm = size === 'sm'
  const contentWidth = isSm ? 'w-[260px]' : 'w-[320px]'
  const daySize = isSm ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm'
  const weekLabelText = isSm ? 'text-[11px]' : 'text-xs'
  const headerText = isSm ? 'text-sm' : 'font-medium'

  // Build calendar grid
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const total = daysInMonth(year, month)
  const weeks = []
  {
    let day = 1
    for (let week = 0; week < 6; week++) {
      const days = []
      for (let d = 0; d < 7; d++) {
        if (week === 0 && d < firstDay) days.push(null)
        else if (day > total) days.push(null)
        else { days.push(new Date(year, month, day)); day++ }
      }
      weeks.push(days)
      if (day > total) break
    }
  }

  function isDisabled(d) {
    if (!d) return true
    const iso = toISO(d)
    if (disabledSet.has(iso)) return true
    if (minDate && d < minDate) return true
    if (maxDate && d > maxDate) return true
    if (disablePast && d < today) return true
    if (disableFuture && d > today) return true
    return false
  }

  function onKeyDown(e) {
    if (!open) return
    if (!focused) return
    let next = new Date(focused)
    switch (e.key) {
      case 'ArrowLeft':
        next.setDate(focused.getDate() - 1); break
      case 'ArrowRight':
        next.setDate(focused.getDate() + 1); break
      case 'ArrowUp':
        next.setDate(focused.getDate() - 7); break
      case 'ArrowDown':
        next.setDate(focused.getDate() + 7); break
      case 'PageUp':
        next = new Date(focused.getFullYear(), focused.getMonth() - 1, focused.getDate()); break
      case 'PageDown':
        next = new Date(focused.getFullYear(), focused.getMonth() + 1, focused.getDate()); break
      case 'Home':
        next = new Date(focused.getFullYear(), focused.getMonth(), 1); break
      case 'End':
        next = new Date(focused.getFullYear(), focused.getMonth() + 1, 0); break
      case 'Enter':
      case ' ': {
        if (!isDisabled(focused)) {
          onChange && onChange(toISO(focused))
          setOpen(false)
        }
        e.preventDefault()
        return
      }
      case 'Escape':
        setOpen(false)
        return
      default:
        return
    }
    setFocused(next)
    setViewMonth(clampToMonth(next))
    e.preventDefault()
  }

  const Trigger = (
    appearance === 'input' ? (
      <div className={cn('relative', className)}>
        <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
        <Input
          readOnly
          value={selected ? formatDisplay(selected) : ''}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setOpen(true) }
          }}
          className={cn('cursor-pointer pl-9', isSm ? 'h-9' : '')}
        />
      </div>
    ) : (
      <Button
        type="button"
        variant="outline"
        className={cn(
          'w-full justify-start text-left font-normal flex items-center gap-2',
          isSm ? 'h-9' : '',
          !selected && 'text-muted-foreground',
          className
        )}
      >
        <CalendarIcon className="h-4 w-4 opacity-60" />
        <span className="truncate">{selected ? formatDisplay(selected) : placeholder}</span>
      </Button>
    )
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {Trigger}
      </PopoverTrigger>
      <PopoverContent className={cn(contentWidth, isSm ? 'p-2' : 'p-3', contentClassName)} onKeyDown={onKeyDown} align="start">
        <div className="flex items-center justify-between mb-2">
          <button type="button" className="p-1 rounded hover:bg-muted" onClick={() => setViewMonth(new Date(year, month - 1, 1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className={cn(headerText)}>{viewMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
          <button type="button" className="p-1 rounded hover:bg-muted" onClick={() => setViewMonth(new Date(year, month + 1, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className={cn('grid grid-cols-7 gap-1 text-muted-foreground mb-1', weekLabelText)}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((wd) => (
            <div key={wd} className="text-center select-none">{wd}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar">
          {weeks.map((wk, i) => wk.map((d, j) => {
            if (!d) return <div key={`${i}-${j}`} />
            const isSelected = selected && d.getFullYear() === selected.getFullYear() && d.getMonth() === selected.getMonth() && d.getDate() === selected.getDate()
            const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
            const disabled = isDisabled(d)
            const isFocused = focused && d.getFullYear() === focused.getFullYear() && d.getMonth() === focused.getMonth() && d.getDate() === focused.getDate()
            return (
              <button
                key={`${i}-${j}`}
                type="button"
                role="gridcell"
                aria-selected={isSelected || undefined}
                aria-disabled={disabled || undefined}
                tabIndex={isFocused ? 0 : -1}
                onClick={() => { if (!disabled) { onChange && onChange(toISO(d)); setOpen(false) } }}
                onFocus={() => setFocused(d)}
                className={cn(
                  'grid place-items-center rounded-sm',
                  daySize,
                  disabled ? 'text-muted-foreground/50 cursor-not-allowed' : 'hover:bg-muted',
                  isToday && !isSelected && 'ring-1 ring-border',
                  isSelected && 'bg-primary text-primary-foreground hover:bg-primary'
                )}
              >
                {d.getDate()}
              </button>
            )
          }))}
        </div>

        <div className={cn('flex items-center justify-between mt-3', isSm ? 'text-xs' : 'text-sm')}>
          <button type="button" className="text-muted-foreground hover:underline" onClick={() => { onChange && onChange(''); setOpen(false) }}>Clear</button>
          <button type="button" className="text-primary hover:underline" onClick={() => { const t = new Date(); onChange && onChange(toISO(t)); setOpen(false) }}>Today</button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
