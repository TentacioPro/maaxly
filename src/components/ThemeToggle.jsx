import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/providers/ThemeProvider'
import { cn } from '@/lib/utils'

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const isDark = theme === 'system' ? resolvedTheme === 'dark' : theme === 'dark'

  function toggle() {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
  <button
      type="button"
      onClick={toggle}
      title={isDark ? 'Switch to light' : 'Switch to dark'}
      aria-label="Toggle theme"
      aria-pressed={isDark}
      className={cn(
        'relative inline-flex items-center rounded-full border border-border bg-muted/60 backdrop-blur-sm',
        'h-8 w-16 px-1 transition-colors duration-300 ease-out hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/40'
      )}
    >
      {/* Sliding thumb */}
      <span
        className="absolute top-1 left-[6px] h-6 w-6 rounded-full bg-background shadow-sm pointer-events-none transition-transform duration-500 ease-in-out"
        style={{ transform: isDark ? 'translateX(28px)' : 'translateX(0px)' }}
      />

      {/* Icons row */}
      <span className="flex w-1/2 items-center justify-center z-10">
        <Sun className={cn('size-4 transition-colors duration-500', isDark ? 'text-muted-foreground/70' : 'text-foreground')} />
      </span>
      <span className="flex w-1/2 items-center justify-center z-10">
        <Moon className={cn('size-4 transition-colors duration-500', isDark ? 'text-foreground' : 'text-muted-foreground/70')} />
      </span>
    </button>
  )
}
