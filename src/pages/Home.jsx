import React from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import LoginForm from '../components/LoginForm'

export default function Home() {
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
            <CardTitle className="text-lg tracking-tight">Sign in</CardTitle>
            <CardDescription>
              Enter your email and password below to <br /> log into your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
          <CardFooter>
            <p className="text-muted-foreground px-8 text-center text-sm">
              By clicking sign in, you agree to our{' '}
              <a href="/terms" className="hover:text-primary underline underline-offset-4">Terms of Service</a>{' '}and{' '}
              <a href="/privacy" className="hover:text-primary underline underline-offset-4">Privacy Policy</a>.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
