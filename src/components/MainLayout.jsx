import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useLocation, useNavigate as useRRNavigate } from 'react-router-dom'
import axios from 'axios'
import { PanelLeft, User, LogOut, Palette, LayoutDashboard, Briefcase, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { Badge } from './ui/badge'
import { MessageSquare } from 'lucide-react'
import { useMessaging } from '@/providers/MessagingProvider'
import PersonalizationWindow from '@/components/PersonalizationWindow'
import { SidebarGroup, SidebarAction } from '@/components/SidebarMenu'
import MessagingDock from '@/components/MessagingDock'

// shadcn/ui imports used across the app
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu'
import { Sheet, SheetTrigger, SheetContent } from './ui/sheet'

function MessagingBadge() {
  // useMessaging cannot be used at top-level in this module because MainLayout already uses hooks; define small component
  try {
    const { unreadCounts = {} } = useMessaging()
    const total = Object.values(unreadCounts || {}).reduce((s, n) => s + (n || 0), 0)
    if (!total) return null
    return <Badge variant="destructive">{total}</Badge>
  } catch (e) {
    return null
  }
}

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
  // messaging dock is now persistent and handles its own collapsed state
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
  const hideMessagingDock = location.pathname.startsWith('/u/') || location.pathname.startsWith('/s/')

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
          'hidden md:flex h-full shrink-0 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-col transition-all duration-500 ease-in-out',
          sidebarCollapsed ? 'w-16' : 'w-64',
        ].join(' ')}
      >
        {sidebarCollapsed ? (
          <div className="h-20 px-3 md:px-4 flex items-center justify-center py-3 transition-all duration-500 ease-in-out">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(v => !v)}
              className="w-10 h-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <div className="text-sm">M</div>
            </button>
          </div>
        ) : (
          <div className="h-20 px-3 md:px-4 py-3 flex items-center justify-between transition-all duration-500 ease-in-out">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarCollapsed(v => !v)}
                className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold"
                aria-label="Toggle sidebar"
              >
                <div className="text-sm">M</div>
              </button>
            </div>
            <div>
              <Button
                size="icon"
                variant="outline"
                className={
                  `md:size-8 ${sidebarCollapsed ? 'rotate-0' : 'rotate-180'} transition-transform duration-500 ease-in-out`
                }
                onClick={() => setSidebarCollapsed(v => !v)}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <PanelLeft />
              </Button>
            </div>
          </div>
        )}
        <nav className="flex-1 py-2">
          <SidebarGroup title={sidebarCollapsed ? '' : 'Overview'}>
            <SidebarAction
              icon={LayoutDashboard}
              active={location.pathname.startsWith('/dashboard')}
              onClick={() => navigate('/dashboard')}
              compact={sidebarCollapsed}
            >
              <span className={sidebarCollapsed ? 'sr-only' : ''}>Dashboard</span>
            </SidebarAction>
            <SidebarAction
              icon={Briefcase}
              active={location.pathname.startsWith('/opportunities')}
              onClick={() => navigate('/opportunities')}
              compact={sidebarCollapsed}
            >
              <span className={sidebarCollapsed ? 'sr-only' : ''}>Opportunities</span>
            </SidebarAction>
            {/* Employer analytics */}
            {typeof window !== 'undefined' && localStorage.getItem('role') === 'employer' && (
              <SidebarAction
                icon={LayoutDashboard}
                active={location.pathname.startsWith('/analytics')}
                onClick={() => navigate('/analytics')}
                compact={sidebarCollapsed}
              >
                <span className={sidebarCollapsed ? 'sr-only' : ''}>Analytics</span>
              </SidebarAction>
            )}
            {/* Admin analytics */}
            {typeof window !== 'undefined' && localStorage.getItem('role') === 'admin' && (
              <SidebarAction
                icon={LayoutDashboard}
                active={location.pathname.startsWith('/admin/analytics')}
                onClick={() => navigate('/admin/analytics')}
                compact={sidebarCollapsed}
              >
                <span className={sidebarCollapsed ? 'sr-only' : ''}>Analytics</span>
              </SidebarAction>
            )}
          </SidebarGroup>

          <SidebarGroup title={sidebarCollapsed ? '' : 'Account'}>
            <SidebarAction
              icon={User}
              active={location.pathname === '/profile'}
              onClick={() => navigate('/profile')}
              compact={sidebarCollapsed}
            >
              <span className={sidebarCollapsed ? 'sr-only' : ''}>Profile</span>
            </SidebarAction>
            <SidebarAction
              icon={Settings}
              active={location.pathname === '/settings'}
              onClick={() => navigate('/settings')}
              compact={sidebarCollapsed}
            >
              <span className={sidebarCollapsed ? 'sr-only' : ''}>Settings</span>
            </SidebarAction>
                <SidebarAction
                  icon={MessageSquare}
                  active={location.pathname === '/messages'}
                  onClick={() => navigate('/messages')}
                  compact={sidebarCollapsed}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className={sidebarCollapsed ? 'sr-only' : ''}>Messages</span>
                    <MessagingBadge />
                  </div>
                </SidebarAction>
          </SidebarGroup>

          <SidebarGroup title={sidebarCollapsed ? '' : 'Appearance'}>
            <SidebarAction
              icon={Palette}
              active={location.pathname === '/personalization'}
              onClick={() => navigate('/personalization')}
              compact={sidebarCollapsed}
            >
              <span className={sidebarCollapsed ? 'sr-only' : ''}>Personalization</span>
            </SidebarAction>
          </SidebarGroup>
        </nav>
      </aside>

      {/* Right content area */}
  <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden transition-all duration-500 ease-in-out">
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
          {/* Left cluster: mobile sheet trigger, desktop toggle, brand */}
          <div className="flex items-center gap-3">
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

            {/* header toggle removed - sidebar has the single toggle under logo */}

            <div className="pl-2">
              <div className="text-md font-semibold">Maaxly</div>
            </div>

            <PersonalizationWindow open={personalizeOpen} onOpenChange={setPersonalizeOpen} />
          </div>

          {/* Center nav */}
          <div className="flex-1 flex justify-center">
            <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6" aria-label="Primary">
              <Link to="/dashboard" className="hover:text-primary text-sm font-medium transition-colors text-muted-foreground">Dashboard</Link>
              <Link to="/opportunities" className="hover:text-primary text-sm font-medium transition-colors text-muted-foreground">Opportunities</Link>
              {token && localStorage.getItem('role') === 'employer' && (
                <Link to="/analytics" className="hover:text-primary text-sm font-medium transition-colors text-muted-foreground">Analytics</Link>
              )}
              {token && localStorage.getItem('role') === 'admin' && (
                <Link to="/admin/analytics" className="hover:text-primary text-sm font-medium transition-colors text-muted-foreground">Analytics</Link>
              )}
              {token && (
                <Link to="/profile" className="hover:text-primary text-sm font-medium transition-colors text-muted-foreground">Profile</Link>
              )}
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

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
  {/* Messaging dock (LinkedIn-style) - always mounted; dock handles its own collapsed state */}
  {!hideMessagingDock && <MessagingDock />}
    </div>
  )
}
