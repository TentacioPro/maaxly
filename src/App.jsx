import './App.css'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import OpportunitiesPage from './pages/OpportunitiesPage'
import OnboardingPage from './pages/OnboardingPage'
import CreateProfileStudent from './pages/CreateStudentProfilePage'
import CreateProfileEmployer from './pages/CreateEmployerProfilePage'
import DashboardPage from './pages/DashboardPage'
import { Navigate } from 'react-router-dom'

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="App-nav">
          <Link to="/">Home</Link>
          {' | '}
          <Link to="/about">About</Link>
          {' | '}
          <Link to="/opportunities">Opportunities</Link>
          {' | '}
          <Link to="/create-profile/student">Create Student Profile</Link>
          {' | '}
          <Link to="/create-profile/employer">Create Employer Profile</Link>
        </nav>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/opportunities" element={<OpportunitiesPage />} />
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
            <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function Protected({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/" replace />
  return children
}

export default App
