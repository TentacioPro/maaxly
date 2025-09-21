import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import ThemeToggle from './ThemeToggle'
import Sidebar from './Sidebar'
import { SidebarGroup, SidebarAction } from '@/components/SidebarMenu'
import PersonalizationWindow from '@/components/PersonalizationWindow'
import { Button } from './ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import { User, Settings, PanelLeft, LogOut } from 'lucide-react'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [personalizeOpen, setPersonalizeOpen] = useState(false)

  // Persistent sidebar handles primary navigation; header keeps branding + actions

  function handleLogout() {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('isAdmin')
      delete axios.defaults.headers.common?.Authorization
    } catch (_) {}
  // Notify app about auth change so components can re-render without hard refresh
  try { window.dispatchEvent(new Event('auth-change')) } catch (_) {}
    // Re-enable any UI interactions if an overlay stuck around
    try {
      document.body.style.overflow = ''
      document.body.style.pointerEvents = ''
      document.documentElement.style.pointerEvents = ''
      const evt = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })
      document.dispatchEvent(evt)
    } catch (_) {}
    navigate('/', { replace: true })
  }

  return (
    <header className="z-50 h-16 sticky top-0 w-full bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="mx-auto max-w-7xl h-full px-4 flex items-center gap-3 sm:gap-4">
        {/* Sidebar trigger */}
        <Sidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          trigger={
            <Button variant="outline" size="icon" aria-label="Open menu" className="md:size-8">
              <PanelLeft className="w-4 h-4" />
            </Button>
          }
        >
          <div className="p-4">
            <div className="flex items-center gap-3 px-2 pb-2">
              <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold">M</div>
              <span className="font-semibold text-lg">Maaxly</span>
            </div>
            <SidebarGroup title="">
              <SidebarAction
                onClick={() => {
                  setSidebarOpen(false)
                  navigate('/personalization')
                }}
              >
                Personalization
              </SidebarAction>
            </SidebarGroup>
          </div>
        </Sidebar>

        {/* Personalization Window */}
        <PersonalizationWindow open={personalizeOpen} onOpenChange={setPersonalizeOpen} />

  {/* Brand removed here - top-left branding is handled by MainLayout */}

  <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Order: Theme, Profile, Settings */}
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
                  {/* Add border and rounded-full to profile icon */}
                  <Button variant="outline" size="icon" className="rounded-md p-2 relative z-20" aria-label="Profile">
                    <User className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings button placed after profile */}
              <Button variant="outline" size="icon" onClick={() => navigate('/settings')} className="rounded-md p-2 relative z-20" aria-label="Settings">
                <Settings className="w-4 h-4" />
              </Button>

              {/* Quick logout icon */}
              <Button variant="destructive" size="icon" onClick={handleLogout} className="rounded-md p-2 relative z-20" aria-label="Logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
