import React from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import SignUpForm from '../components/SignUpForm'

export default function SignupPage({ setRole }) {
  const navigate = useNavigate()

  const onAuth = async ({ user, token, role }) => {
    // persist token and role locally
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`
      localStorage.setItem('token', token)
    }

    const pickedRole = role || null
    if (pickedRole) {
      setRole(pickedRole)
      localStorage.setItem('role', pickedRole)
    }

    // Call backend onboarding role endpoint to persist the user's role server-side
    // then route the user to the role-specific profile creation page so they can
    // fill the details required by /api/profile/student or /api/profile/employer.
    try {
      if (user && pickedRole) {
        await axios.post('/api/onboarding/role', { userId: user._id, role: pickedRole })
      }
    } catch (err) {
      // log but continue to route user — backend may accept role during profile creation
      console.error('onboarding role set failed', err?.response?.data || err.message || err)
    }

    // Send user to the proper onboarding form
    if (pickedRole === 'student') {
      navigate('/create-profile/student')
    } else if (pickedRole === 'employer') {
      navigate('/create-profile/employer')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="container grid min-h-[calc(100svh-48px)] max-w-none items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:w-[480px] sm:p-8">
        <div className="mb-4 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2 h-6 w-6">
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <h1 className="text-xl font-medium">Maaxly</h1>
        </div>
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="text-lg tracking-tight">Sign up</CardTitle>
            <CardDescription>
              Create your account with your email and password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignUpForm onAuth={onAuth} />
          </CardContent>
          <CardFooter>
            <p className="text-muted-foreground px-8 text-center text-sm">
              By clicking sign up, you agree to our{' '}
              <a href="/terms" className="hover:text-primary underline underline-offset-4">Terms of Service</a>{' '}and{' '}
              <a href="/privacy" className="hover:text-primary underline underline-offset-4">Privacy Policy</a>.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
