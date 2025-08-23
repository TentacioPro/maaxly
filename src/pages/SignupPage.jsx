import React from 'react'
import AuthForm from '../components/AuthForm'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function SignupPage({ setRole }) {
  const navigate = useNavigate()

  const onAuth = async ({ user, token, role }) => {
    if (role) {
      setRole(role)
      localStorage.setItem('role', role)
    } else {
      try {
        const res = await axios.get('/api/profile/me')
        if (res?.data?.type) {
          setRole(res.data.type)
          localStorage.setItem('role', res.data.type)
        }
      } catch (e) {
        // ignore
      }
    }
    navigate('/dashboard')
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Sign Up</h2>
      <AuthForm mode="signup" onAuth={onAuth} />
    </div>
  )
}
