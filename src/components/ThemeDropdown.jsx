import React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Laptop } from 'lucide-react'
import { Button } from '../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../components/ui/dropdown-menu'

export default function ThemeDropdown() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="outline" aria-label="Toggle theme" className="md:size-8">
          {/* Sun/Moon swap */}
          <Sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-40">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun />
          Light {theme === 'light' ? '✓' : ''}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon />
          Dark {theme === 'dark' ? '✓' : ''}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Laptop />
          System {theme === 'system' ? '✓' : ''}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}