import './App.css'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import OpportunitiesPage from './pages/OpportunitiesPage'
import OpportunitiesListPage from './pages/OpportunitiesListPage'
import OnboardingPage from './pages/OnboardingPage'
import CreateProfileStudent from './pages/CreateStudentProfilePage'
import CreateProfileEmployer from './pages/CreateEmployerProfilePage'
import DashboardPage from './pages/DashboardPage'
import CreateOpportunityPage from './pages/CreateOpportunityPage'
import { Navigate } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ListingDetailsPage from './pages/ListingDetailsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'

function App() {
  const [role, setRole] = useState(null) // 'student' | 'employer' | null

  // ensure axios carries token on page load / refresh and fetch role
  useEffect(() => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (token) {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`
        // fetch profile to determine role
        (async () => {
          try {
            const res = await axios.get('/api/profile/me')
            // server returns { success: true, profile, type }
            if (res?.data?.type) {
              setRole(res.data.type)
              localStorage.setItem('role', res.data.type)
            } else {
              setRole(null)
              localStorage.removeItem('role')
            }
          } catch (e) {
            // couldn't fetch profile (not onboarded or invalid token)
            setRole(null)
            localStorage.removeItem('role')
          }
        })()
      } else {
        delete axios.defaults.headers.common.Authorization
        setRole(null)
        localStorage.removeItem('role')
      }
    } catch (err) {
      // ignore
    }
  }, [])

  return (
    <Router>
      <div className="App">
        <TopNav role={role} setRole={setRole} />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/opportunities" element={<OpportunitiesPage />} />
            <Route path="/opportunities/list" element={<OpportunitiesListPage />} />
            <Route path="/login" element={<LoginPage setRole={setRole} />} />
            <Route path="/signup" element={<SignupPage setRole={setRole} />} />

            <Route
              path="/onboarding"
              element={
                <Protected>
                  <OnboardingPage />
                </Protected>
              }
            />

            <Route path="/create-profile/student" element={<CreateProfileStudent />} />
            <Route path="/create-profile/employer" element={<CreateProfileEmployer />} />

            <Route path="/create-opportunity" element={<Protected><CreateOpportunityPage /></Protected>} />

            <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
            <Route path="/dashboard/listing/:id" element={<Protected><ListingDetailsPage /></Protected>} />
            <Route path="/admin" element={<Protected><AdminDashboardPage /></Protected>} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function TopNav({ role, setRole }) {
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    try { delete axios.defaults.headers.common.Authorization } catch (e) {}
    setRole(null)
    navigate('/')
    window.location.reload()
  }

  return (
    <nav className="App-nav" style={{ padding: 12, borderBottom: '1px solid #eee', marginBottom: 12 }}>
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
  if (!token) return <Navigate to="/" replace />
  return children
}

export default App
