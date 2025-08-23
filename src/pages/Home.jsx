import React from 'react'
import AuthForm from '../components/AuthForm'
import ProfileForm from '../components/ProfileForm'

export default function Home() {
  return (
    <div>
      <h1>Home</h1>
      <p>Welcome to the Vite + React (JS) starter.</p>
  <AuthForm />
  <ProfileForm />
    </div>
  )
}
