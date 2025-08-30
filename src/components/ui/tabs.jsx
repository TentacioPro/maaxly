import React, { createContext, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

const TabsContext = createContext(null)

export function Tabs({ defaultValue, value: controlled, onValueChange, className, children }) {
  const isControlled = controlled != null
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = isControlled ? controlled : uncontrolled
  function setValue(v) {
    if (!isControlled) setUncontrolled(v)
    onValueChange?.(v)
  }
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children }) {
  return (
    <div className={cn('inline-flex h-9 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground', className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, className, children }) {
  const ctx = useContext(TabsContext)
  const active = ctx?.value === value
  return (
    <button
      type="button"
      onClick={() => ctx?.setValue(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, className, children }) {
  const ctx = useContext(TabsContext)
  if (ctx?.value !== value) return null
  return <div className={cn('mt-3', className)}>{children}</div>
}
