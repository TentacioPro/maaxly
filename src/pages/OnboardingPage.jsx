import React from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function OnboardingPage() {
  const navigate = useNavigate()

  const sendRole = async (role) => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/onboarding/role', { role }, { headers: { Authorization: `Bearer ${token}` } })
      if (res.data?.redirect) navigate(res.data.redirect)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || err.message)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 80 }}>
      <button onClick={() => sendRole('student')} style={{ padding: '40px 80px', fontSize: 20 }}>I am a Student</button>
      <button onClick={() => sendRole('employer')} style={{ padding: '40px 80px', fontSize: 20 }}>I am an Employer</button>
    </div>
  )
}
