import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

function isActivePath(currentPath, href) {
  // exact match or same base segment
  if (!href) return false
  if (currentPath === href) return true
  const curBase = currentPath.split('?')[0]
  if (curBase === href) return true
  const curSeg = curBase.split('/')[1]
  const hrefSeg = href.split('/')[1]
  return curSeg && hrefSeg && curSeg === hrefSeg
}

export default function MainNavigation({ links = [], className = '' }) {
  const location = useLocation()
  const path = location.pathname + (location.search || '')

  const items = links.map((l) => ({
    ...l,
    isActive: isActivePath(path, l.to),
  }))

  return (
    <>
      {/* Mobile: dropdown */}
      <div className='lg:hidden'>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button size='icon' variant='outline' className='md:size-8'>
              <Menu />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side='bottom' align='start'>
            {items.map(({ title, to, isActive, disabled }) => (
              <DropdownMenuItem key={`${title}-${to}`} asChild>
                <Link
                  to={to}
                  className={!isActive ? 'text-muted-foreground' : ''}
                  aria-disabled={disabled}
                  onClick={(e) => disabled && e.preventDefault()}
                >
                  {title}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop nav */}
      <nav className={`hidden items-center space-x-4 lg:flex lg:space-x-4 xl:space-x-6 ${className}`}>
        {items.map(({ title, to, isActive, disabled }) => (
          <Link
            key={`${title}-${to}`}
            to={disabled ? '#' : to}
            aria-disabled={disabled}
            className={`hover:text-primary text-sm font-medium transition-colors ${isActive ? '' : 'text-muted-foreground'} ${disabled ? 'pointer-events-none opacity-60' : ''}`}
            onClick={(e) => disabled && e.preventDefault()}
          >
            {title}
          </Link>
        ))}
      </nav>
    </>
  )
}
