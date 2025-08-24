import React, { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

function pad(n){ return n<10?`0${n}`:`${n}` }
function toISO(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
function fromISO(s){ if(!s) return null; const t = s.split('-'); if(t.length!==3) return null; return new Date(Number(t[0]), Number(t[1])-1, Number(t[2])) }
function formatDisplayISO(s){ const d = fromISO(s); return d ? d.toLocaleDateString() : '' }

export default function DatePicker({ value, onChange, placeholder = 'Pick a date' }){
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const selected = fromISO(value)

  // calendar view state
  const today = new Date()
  const initialMonth = selected ? new Date(selected.getFullYear(), selected.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1)
  const [viewMonth, setViewMonth] = useState(initialMonth)

  useEffect(()=>{
    function onDoc(e){ if(!ref.current) return; if(!ref.current.contains(e.target)) setOpen(false) }
    if(open) document.addEventListener('mousedown', onDoc)
    return ()=> document.removeEventListener('mousedown', onDoc)
  },[open])

  useEffect(()=>{ // when value changes from outside, update viewMonth
    const d = fromISO(value)
    if(d) setViewMonth(new Date(d.getFullYear(), d.getMonth(),1))
  },[value])

  function daysInMonth(year, month){ return new Date(year, month+1, 0).getDate() }

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay() // 0..6
  const total = daysInMonth(year, month)

  const weeks = []
  let day = 1
  for(let week=0; week<6; week++){
    const days = []
    for(let d=0; d<7; d++){
      if(week===0 && d<firstDay){ days.push(null) }
      else if(day>total) { days.push(null) }
      else { days.push(new Date(year, month, day)); day++ }
    }
    weeks.push(days)
    if(day>total) break
  }

  return (
    <div className="relative inline-block w-full" ref={ref}>
  <Button type="button" variant="outline" onClick={()=>setOpen(v=>!v)} className={`data-[empty=${!value}]:text-muted-foreground w-full justify-start text-start font-normal`}>
        { value ? formatDisplayISO(value) : placeholder }
        <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
      </Button>

      {open && (
        <div className="absolute left-0 mt-2 z-50 bg-popover text-popover-foreground rounded-md border shadow-lg p-3 w-[320px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={()=>setViewMonth(new Date(year, month-1,1))} className="p-1 rounded hover:bg-muted"><ChevronLeft className="h-4 w-4"/></button>
              <div className="font-medium">{viewMonth.toLocaleString(undefined, { month: 'long' })} {year}</div>
              <button type="button" onClick={()=>setViewMonth(new Date(year, month+1,1))} className="p-1 rounded hover:bg-muted"><ChevronRight className="h-4 w-4"/></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-1">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map((wd)=> (<div key={wd} className="text-center">{wd}</div>))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weeks.map((wk, i) => wk.map((d, j) => {
              if(!d) return <div key={`${i}-${j}`} />
              const isSelected = selected && d.getFullYear()===selected.getFullYear() && d.getMonth()===selected.getMonth() && d.getDate()===selected.getDate()
              const isToday = d.getFullYear()===today.getFullYear() && d.getMonth()===today.getMonth() && d.getDate()===today.getDate()
              return (
                <button key={`${i}-${j}`} type="button" onClick={() => { onChange && onChange(toISO(d)); setOpen(false) }} className={`w-8 h-8 grid place-items-center rounded ${isSelected? 'bg-sky-600 text-white': isToday? 'border rounded':''} hover:bg-muted`}>{d.getDate()}</button>
              )
            }))}
          </div>

          <div className="flex items-center justify-between mt-3">
            <button type="button" className="text-sm text-muted-foreground" onClick={()=>{ onChange && onChange(''); setOpen(false) }}>Clear</button>
            <button type="button" className="text-sm text-primary" onClick={()=>{ const t = new Date(); onChange && onChange(toISO(t)); setOpen(false) }}>Today</button>
          </div>
        </div>
      )}
    </div>
  )
}
