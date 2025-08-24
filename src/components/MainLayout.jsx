import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, User, Settings } from 'lucide-react'
import ThemeDropdown from './ThemeDropdown'

// shadcn/ui imports used across the app
import { Button } from './ui/button'
import { Tooltip } from './ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu'
import { Sheet, SheetTrigger, SheetContent } from './ui/sheet'

export default function MainLayout({ children, fixed = true, fluid = false }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [offset, setOffset] = useState(0)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => {
      const y = document.body.scrollTop || document.documentElement.scrollTop
      setOffset(y || 0)
    }
    document.addEventListener('scroll', onScroll, { passive: true })
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  function handleLogout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
  {/* Removed always-visible skip link to avoid overlay behind logo */}

      {/* Header - sticky with scroll shadow, mirrors golden-repo header structure */}
      <header
        className={[
          'z-50 h-16',
          fixed ? 'sticky top-0 w-full' : '',
          offset > 10 && fixed ? 'shadow' : 'shadow-none',
        ].join(' ')}
      >
        <div
          className={[
            'relative flex h-full items-center gap-3 p-4 sm:gap-4',
            offset > 10 && fixed
              ? 'after:bg-background/20 after:absolute after:inset-0 after:-z-10 after:backdrop-blur-lg'
              : '',
          ].join(' ')}
        >
          {/* Left: Brand */}
          <div className="flex items-center flex-1">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold">M</div>
              <span className="font-semibold text-lg hidden sm:inline">Maaxly</span>
            </Link>
          </div>

          {/* Center: Top navigation (desktop) */}
          <div className="flex-1 flex justify-center">
            <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6" aria-label="Primary">
              <Link to="/dashboard" className="hover:text-primary text-sm font-medium transition-colors text-muted-foreground">Dashboard</Link>
              <Link to="/opportunities" className="hover:text-primary text-sm font-medium transition-colors text-muted-foreground">Opportunities</Link>
              <Link to="/profile" className="hover:text-primary text-sm font-medium transition-colors text-muted-foreground">Profile</Link>
            </nav>
          </div>

          {/* Right: actions */}
          <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <ThemeDropdown />
            </div>

            <div className="hidden sm:block">
              <Tooltip content="Settings">
                <Button variant="outline" size="icon" className="group md:size-8">
                  <Settings />
                </Button>
              </Tooltip>
            </div>

            {!token ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login"><Button variant="outline" size="sm">Login</Button></Link>
                <Link to="/signup"><Button size="sm">Sign Up</Button></Link>
              </div>
            ) : (
              <div className="hidden sm:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm"><User className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/profile')}>Profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Mobile: menu trigger */}
            <div className="lg:hidden">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button size="icon" variant="outline" onClick={() => setSheetOpen(true)} className="md:size-8">
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <div className="py-4">
                    <div className="px-4 mb-4">
                      <Link to="/" onClick={() => setSheetOpen(false)} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold">M</div>
                        <span className="font-semibold">Maaxly</span>
                      </Link>
                    </div>
                    <nav className="flex flex-col space-y-2 px-4">
                      <Link to="/dashboard" onClick={() => setSheetOpen(false)} className="py-2 text-sm font-medium transition-colors">Dashboard</Link>
                      <Link to="/opportunities" onClick={() => setSheetOpen(false)} className="py-2 text-sm font-medium transition-colors">Opportunities</Link>
                      <Link to="/profile" onClick={() => setSheetOpen(false)} className="py-2 text-sm font-medium transition-colors">Profile</Link>
                    </nav>

                    <div className="px-4 mt-4">
                      <ThemeDropdown />
                    </div>

                    <div className="px-4 mt-6">
                      {!token ? (
                        <div className="flex flex-col gap-2">
                          <Link to="/login" onClick={() => setSheetOpen(false)}><Button variant="outline">Login</Button></Link>
                          <Link to="/signup" onClick={() => setSheetOpen(false)}><Button>Sign Up</Button></Link>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <Button onClick={() => { setSheetOpen(false); navigate('/profile') }}>Profile</Button>
                          <Button variant="destructive" onClick={() => { setSheetOpen(false); handleLogout() }}>Logout</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main content area, mirrors golden-repo Main component behavior */}
    <main
        id="main"
        data-layout={fixed ? 'fixed' : 'auto'}
        className={[
      'px-4 py-6 pt-16 flex-1',
          fixed ? 'flex grow flex-col overflow-hidden' : '',
          !fluid ? 'mx-auto w-full max-w-7xl' : '',
        ].join(' ')}
      >
        {children}
      </main>
    </div>
  )
}
