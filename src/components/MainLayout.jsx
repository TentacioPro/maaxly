import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useLocation, useNavigate as useRRNavigate } from 'react-router-dom'
import axios from 'axios'
import { PanelLeft, User, LogOut, Palette, LayoutDashboard, Briefcase, Settings } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import PersonalizationWindow from '@/components/PersonalizationWindow'
import { SidebarGroup, SidebarAction } from '@/components/SidebarMenu'

// shadcn/ui imports used across the app
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu'
import { Sheet, SheetTrigger, SheetContent } from './ui/sheet'

export default function MainLayout({ children, fixed = true, fluid = false }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [personalizeOpen, setPersonalizeOpen] = useState(false)
  const [offset, setOffset] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('ui:sidebar:collapsed') === '1'
  })
  const mainRef = useRef(null)
  // Keep token reactive so UI updates immediately after login/logout
  const [token, setToken] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('token') : null))
  const navigate = useNavigate()
  const location = useLocation()

  // Track scroll on the internal main content container instead of the document
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const onScroll = () => setOffset(el.scrollTop || 0)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [mainRef.current])

  // persist sidebar collapsed state
  useEffect(() => {
    try {
      localStorage.setItem('ui:sidebar:collapsed', sidebarCollapsed ? '1' : '0')
    } catch (_) {}
  }, [sidebarCollapsed])

  // Listen for storage changes (other tabs) and custom auth-change events (same tab)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token') setToken(e.newValue)
    }
    const onAuthChange = () => setToken(typeof window !== 'undefined' ? localStorage.getItem('token') : null)
    window.addEventListener('storage', onStorage)
    window.addEventListener('auth-change', onAuthChange)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('auth-change', onAuthChange)
    }
  }, [])

  // Simple page view analytics
  useEffect(() => {
    const role = typeof window !== 'undefined' ? (localStorage.getItem('role') || (token ? 'guest' : 'guest')) : 'guest'
    const payload = { path: location.pathname + (location.search || ''), role }
    axios.post('/api/analytics/track', payload).catch(() => {})
  }, [location.pathname, location.search, token])

  // Disable main content scroll on auth/onboarding pages to keep cards centered
  const noScrollRoutes = React.useMemo(() => (
    ['/login', '/signup', '/create-profile/student', '/create-profile/employer', '/onboarding']
  ), [])
  const noScroll = noScrollRoutes.some((p) => location.pathname.startsWith(p))

  function unlockUI() {
    try {
      // Re-enable scrolling/clicks if any modal/panel left them disabled
      document.body.style.overflow = ''
      document.body.style.pointerEvents = ''
      document.documentElement.style.pointerEvents = ''
      // Dispatch Escape to close any open Radix menus/dialogs
      const evt = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })
      document.dispatchEvent(evt)
    } catch (_) {}
  }

  function handleLogout() {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('isAdmin')
      // Clear axios auth header
      delete axios.defaults.headers.common?.Authorization
    } catch (_) {}
    // Update local state and broadcast change so other components rerender
    setToken(null)
    try { window.dispatchEvent(new Event('auth-change')) } catch (_) {}
  setSheetOpen(false)
  setNavOpen(false)
  unlockUI()
  navigate('/', { replace: true })
  }

  return (
    <div className="h-screen overflow-hidden bg-background flex">
      {/* Persistent Sidebar (md+) */}
      <aside
        className={[
          'hidden md:flex h-full shrink-0 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-col transition-all duration-200',
          sidebarCollapsed ? 'w-16' : 'w-64',
        ].join(' ')}
      >
        <div className="h-16 px-3 md:px-4 flex items-center gap-3 border-b">
          <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold">M</div>
        </div>
        <nav className="flex-1 py-2">
          <SidebarGroup title={sidebarCollapsed ? '' : 'Overview'}>
            <SidebarAction
              icon={LayoutDashboard}
              active={location.pathname.startsWith('/dashboard')}
              onClick={() => navigate('/dashboard')}
            >
              <span className={sidebarCollapsed ? 'sr-only' : ''}>Dashboard</span>
            </SidebarAction>
            <SidebarAction
              icon={Briefcase}
              active={location.pathname.startsWith('/opportunities')}
              onClick={() => navigate('/opportunities')}
            >
              <span className={sidebarCollapsed ? 'sr-only' : ''}>Opportunities</span>
            </SidebarAction>
          </SidebarGroup>

          <SidebarGroup title={sidebarCollapsed ? '' : 'Account'}>
            <SidebarAction
              icon={User}
              active={location.pathname === '/profile'}
              onClick={() => navigate('/profile')}
            >
              <span className={sidebarCollapsed ? 'sr-only' : ''}>Profile</span>
            </SidebarAction>
            <SidebarAction
              icon={Settings}
              active={location.pathname === '/settings'}
              onClick={() => navigate('/settings')}
            >
              <span className={sidebarCollapsed ? 'sr-only' : ''}>Settings</span>
            </SidebarAction>
          </SidebarGroup>

          <SidebarGroup title={sidebarCollapsed ? '' : 'Appearance'}>
            <SidebarAction
              icon={Palette}
              active={location.pathname === '/personalization'}
              onClick={() => navigate('/personalization')}
            >
              <span className={sidebarCollapsed ? 'sr-only' : ''}>Personalization</span>
            </SidebarAction>
          </SidebarGroup>
        </nav>
      </aside>

      {/* Right content area */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* Header - sticky with scroll shadow */}
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
            {/* Left: Sidebar toggle (md+) and Mobile menu trigger (md:hidden) + Brand */}
            <div className="flex items-center flex-1">
              <div className="mr-2 hidden md:block">
                <Button
                  size="icon"
                  variant="outline"
                  className="md:size-8"
                  aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  onClick={() => setSidebarCollapsed((v) => !v)}
                >
                  <PanelLeft className={[sidebarCollapsed ? 'rotate-180' : '', 'transition-transform'].join(' ')} />
                </Button>
              </div>
              {/* Desktop brand text to the right of the toggle */}
              <div className="hidden md:flex items-center mr-2">
                <span className="font-semibold text-lg select-none">Maaxly</span>
              </div>

              <div className="mr-2 md:hidden">
                <Sheet open={navOpen} onOpenChange={setNavOpen}>
                  <SheetTrigger asChild>
                    <Button size="icon" variant="outline" className="md:size-8" aria-label="Open menu">
                      <PanelLeft />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-3/4 sm:max-w-sm">
                    <div className="p-4 border-b">
                      <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold">M</div>
                    </div>
                    <div className="p-2">
                      <SidebarGroup title="">
                        <SidebarAction
                          icon={Palette}
                          onClick={() => {
                            setNavOpen(false)
                            navigate('/personalization')
                          }}
                        >
                          <span>Personalization</span>
                        </SidebarAction>
                      </SidebarGroup>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
      {/* Brand removed per request */}
      <div className="hidden sm:block" />
              <PersonalizationWindow open={personalizeOpen} onOpenChange={setPersonalizeOpen} />
            </div>

          {/* Center: Top navigation (desktop) */}
          <div className="flex-1 flex justify-center">
            <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6" aria-label="Primary">
              <Link to="/dashboard" className="hover:text-primary text-sm font-medium transition-colors text-muted-foreground">Dashboard</Link>
              <Link to="/opportunities" className="hover:text-primary text-sm font-medium transition-colors text-muted-foreground">Opportunities</Link>
              {token && (
                <Link to="/profile" className="hover:text-primary text-sm font-medium transition-colors text-muted-foreground">Profile</Link>
              )}
              {/* Admin link hidden for admin users because Dashboard already shows the admin context */}
              {false && token && localStorage.getItem('role') === 'admin' && (
                <Link to="/admin" className="hover:text-primary text-sm font-medium transition-colors text-muted-foreground">Admin</Link>
              )}
            </nav>
          </div>

          {/* Right: actions */}
          <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {!token ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login"><Button variant="outline" size="sm">Login</Button></Link>
                <Link to="/signup"><Button size="sm">Sign Up</Button></Link>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="md:size-8" aria-label="Profile">
                      <User className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/profile')}>Profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="destructive" size="icon" className="md:size-8" aria-label="Logout" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* No extra mobile menu (handled on the left by md:hidden sheet) */}
          </div>
        </div>
        </header>

      {/* Main content area, mirrors golden-repo Main component behavior */}
        <main
          id="main"
          ref={mainRef}
          data-layout={fixed ? 'fixed' : 'auto'}
          className={[
            'px-4 py-6 flex-1 min-h-0',
            noScroll ? 'overflow-hidden lg:overflow-auto' : 'overflow-auto',
            !fluid ? 'mx-auto w-full max-w-7xl' : '',
          ].join(' ')}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
