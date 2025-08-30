import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import SignUpForm from '../components/SignUpForm'

export default function SignupPage({ setRole }) {
  const navigate = useNavigate()

  // Disable app scroll while on signup and center card
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

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

  // notify the app that auth state changed so headers/menus update without refresh
  try { window.dispatchEvent(new Event('auth-change')) } catch (_) {}

  // Go to onboarding; it will auto-advance using the selected role and redirect
  navigate('/onboarding', { replace: true, state: { autoRole: pickedRole } })
  }

  return (
    <div className="h-full w-full grid place-items-center overflow-hidden px-4">
  <div className="mx-auto w-full max-w-[92vw] sm:max-w-[420px] md:max-w-[480px] xl:max-w-[560px] 2xl:max-w-[640px] space-y-2 py-8">
        <div className="mb-4 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2 h-6 w-6">
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <h1 className="text-xl font-medium">Maaxly</h1>
        </div>
  <Card className="gap-4 bg-card text-card-foreground shadow max-h-[calc(100svh-2rem)] overflow-auto lg:max-h-none lg:overflow-visible">
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
