import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import MainNavigation from './MainNavigation'
import ThemeDropdown from './ThemeDropdown'
import { Button } from './ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import { User, Settings } from 'lucide-react'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const links = [
    { title: 'Dashboard', to: '/dashboard' },
    { title: 'Opportunities', to: '/opportunities' },
    { title: 'Profile', to: '/profile' },
  ]

  function handleLogout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <header className="z-50 h-16 sticky top-0 w-full bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="mx-auto max-w-7xl h-full px-4 flex items-center gap-3 sm:gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold">M</div>
          <span className="font-semibold text-lg hidden sm:inline">Maaxly</span>
        </Link>

        {/* Navigation */}
  <div className="flex-1 flex justify-center">
          <MainNavigation links={links} />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Order: Theme, Profile, Settings */}
          <div className="hidden sm:block"><ThemeDropdown /></div>

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
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
