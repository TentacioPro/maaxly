import './App.css'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate, Outlet } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import { ToasterProvider } from './components/ui/toast'
import React, { useEffect, useState, Suspense, lazy } from 'react'
import axios from 'axios'

// Route-level code splitting
const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))
const OpportunitiesPage = lazy(() => import('./pages/OpportunitiesPage'))
const OpportunitiesListPage = lazy(() => import('./pages/OpportunitiesListPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const CreateProfileStudent = lazy(() => import('./pages/CreateStudentProfilePage'))
const CreateProfileEmployer = lazy(() => import('./pages/CreateEmployerProfilePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CreateOpportunityPage = lazy(() => import('./pages/CreateOpportunityPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const ListingDetailsPage = lazy(() => import('./pages/ListingDetailsPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const ProfileViewPage = lazy(() => import('./pages/ProfileViewPage'))
const CompanyDetailsPage = lazy(() => import('./pages/CompanyDetailsPage'))
const PersonalizationPage = lazy(() => import('./pages/PersonalizationPage'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const EmployerAnalyticsPage = lazy(() => import('./pages/EmployerAnalyticsPage'))
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage'))
const PublicProfileRoute = lazy(() => import('./pages/PublicProfileRoute'))

function MainLayoutShell() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  )
}

function App() {
  const [role, setRole] = useState(null) // 'student' | 'employer' | null
  const [token, setToken] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('token') : null))

  // ensure axios carries token and react to auth changes (login/logout) without hard refresh
  useEffect(() => {
    async function syncAuthFromStorage() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (token) {
          axios.defaults.headers.common.Authorization = `Bearer ${token}`
          try {
            const res = await axios.get('/api/profile/me')
            if (res?.data?.type) {
              setRole(res.data.type)
              localStorage.setItem('role', res.data.type)
            } else {
              setRole(null)
              localStorage.removeItem('role')
            }
          } catch (err) {
            // If token is invalid or expired, clear it so app falls back to unauthenticated state.
            try {
              const status = err?.response?.status
              if (status === 401 || status === 403) {
                localStorage.removeItem('token')
                delete axios.defaults.headers.common.Authorization
                setToken(null)
              }
            } catch (e) {}
            setRole(null)
            localStorage.removeItem('role')
          }
        } else {
          delete axios.defaults.headers.common.Authorization
          setRole(null)
          localStorage.removeItem('role')
        }
      } catch {}
    }

    // initial sync
    syncAuthFromStorage()

    const onStorage = (e) => { if (e.key === 'token') { setToken(e.newValue); syncAuthFromStorage() } }
    const onAuthChange = () => { setToken(typeof window !== 'undefined' ? localStorage.getItem('token') : null); syncAuthFromStorage() }
    window.addEventListener('storage', onStorage)
    window.addEventListener('auth-change', onAuthChange)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('auth-change', onAuthChange)
    }
  }, [])

  // If there's no token, render a minimal router that only shows auth pages (login/signup/home)
  if (!token) {
    return (
      <Router>
        <ToasterProvider>
          <div className="App">
            <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginPage setRole={setRole} />} />
                <Route path="/signup" element={<SignupPage setRole={setRole} />} />
                <Route path="/u/:username" element={<PublicProfileRoute />} />
                <Route path="/s/:publicId" element={<PublicProfileRoute />} />
                {/* Redirect any other route to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </div>
        </ToasterProvider>
      </Router>
    )
  }

  // Authenticated app (original behavior) - MainLayout and full routes
  return (
    <Router>
      <ToasterProvider>
        <div className="App">
          <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
            <Routes>
              <Route path="/u/:username" element={<PublicProfileRoute />} />
              <Route path="/s/:publicId" element={<PublicProfileRoute />} />
              <Route element={<MainLayoutShell />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/about" element={<About />} />
                <Route path="/opportunities" element={<OpportunitiesPage />} />
                <Route path="/opportunities/list" element={<OpportunitiesListPage />} />
                <Route 
                  path="/profile" 
                  element={
                    <Protected>
                      <ProfileViewPage />
                    </Protected>
                  } 
                />
                <Route
                  path="/onboarding"
                  element={
                    <Protected>
                      <OnboardingPage />
                    </Protected>
                  }
                />
                <Route 
                  path="/create-profile/student" 
                  element={
                    <Protected>
                      <CreateProfileStudent />
                    </Protected>
                  } 
                />
                <Route 
                  path="/create-profile/employer" 
                  element={
                    <Protected>
                      <CreateProfileEmployer />
                    </Protected>
                  } 
                />
                <Route
                  path="/create-opportunity"
                  element={
                    <RequireRole allowed={["employer"]}>
                      <CreateOpportunityPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <Protected>
                      <DashboardPage />
                    </Protected>
                  }
                />
                <Route
                  path="/dashboard/listing/:id"
                  element={
                    <Protected>
                      <ListingDetailsPage />
                    </Protected>
                  }
                />
                <Route path="/company/:id" element={<CompanyDetailsPage />} />
                <Route
                  path="/admin"
                  element={
                    <Protected>
                      <AdminDashboardPage />
                    </Protected>
                  }
                />
                <Route path="/personalization" element={<PersonalizationPage />} />
                <Route
                  path="/messages"
                  element={
                    <Protected>
                      <MessagesPage />
                    </Protected>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <RequireRole allowed={["employer","admin"]}>
                      <EmployerAnalyticsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="/admin/analytics"
                  element={
                    <RequireRole allowed={["admin"]}>
                      <AdminAnalyticsPage />
                    </RequireRole>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </div>
      </ToasterProvider>
    </Router>
  )
}

function TopNav({ role, setRole }) {
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  function handleLogout() {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
  // legacy cleanup: remove stale isAdmin flag in storage
  localStorage.removeItem('isAdmin')
      delete axios.defaults.headers.common?.Authorization
    } catch (_) {}
    setRole(null)
    navigate('/', { replace: true })
    setTimeout(() => { if (typeof window !== 'undefined') window.location.replace('/') }, 0)
  }

  return (
    <nav className="App-nav" style={{ padding: 12, borderBottom: '1px solid #eee', marginBottom: 12, justifyContent:"center" }}>
      <Link to="/">Home</Link>
      {' | '}
      <Link to="/opportunities">Opportunities</Link>

      {' | '}
      {!token && (
        <>
          <Link to="/create-profile/student">Create Student Profile</Link>
          {' | '}
          <Link to="/create-profile/employer">Create Employer Profile</Link>
        </>
      )}

      {token && role === 'student' && (
        <>
          {' | '}
          <Link to="/dashboard">Dashboard</Link>
          {' | '}
          {/* students don't create opportunities */}
        </>
      )}

      {token && role === 'employer' && (
        <>
          {' | '}
          <Link to="/dashboard">Dashboard</Link>
          {' | '}
          <Link to="/create-opportunity">Create Opportunity</Link>
        </>
      )}

      {' | '}
      {token ? (
        <button onClick={handleLogout} style={{ marginLeft: 8 }}>Logout</button>
      ) : (
        <Link to="/">Login / Signup</Link>
      )}
    </nav>
  )
}

function Protected({ children }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (!token) return <Navigate to="/login" replace />
  return children
}

// RequireRole: wrapper that ensures user is authenticated and has one of the allowed roles
function RequireRole({ allowed = [], children }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
  if (!token) return <Navigate to="/login" replace />
  // admins should always be allowed
  if (role === 'admin') return children
  if (role && allowed.includes(role)) return children
  try {
    // Do not trust localStorage isAdmin; rely on role value only
  } catch (e) {}
  // fallback: deny access
  return <Navigate to="/" replace />
}

export default App
