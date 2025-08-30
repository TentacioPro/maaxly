import React from 'react'
import { cn } from '@/lib/utils'

export function Separator({ className, orientation = 'horizontal', decorative = true, ...props }) {
  const isHorizontal = orientation !== 'vertical'
  return (
    <div
      role={decorative ? 'none' : 'separator'}
      aria-orientation={isHorizontal ? 'horizontal' : 'vertical'}
      className={cn(
        'shrink-0 bg-border',
        isHorizontal ? 'h-px w-full' : 'h-full w-px',
        className
      )}
      {...props}
    />
  )
}
