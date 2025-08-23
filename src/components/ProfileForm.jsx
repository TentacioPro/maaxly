import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ProfileForm() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('student')
  const [bio, setBio] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // route user to role-specific profile creation page
    if (role === 'student') return navigate('/create-profile/student')
    return navigate('/create-profile/employer')
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16, maxWidth: 480 }}>
      <h3>Your Profile</h3>
      <div style={{ marginBottom: 8 }}>
        <label>Full Name</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%', padding: 8 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: 8 }}>
          <option value="student">Student</option>
          <option value="employer">Employer</option>
        </select>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} style={{ width: '100%', padding: 8 }} />
      </div>
      <div>
        <button type="submit" disabled={loading}>Save Profile</button>
      </div>
      {message && <div style={{ marginTop: 8, color: message.type === 'error' ? 'crimson' : 'green' }}>{message.text}</div>}
    </form>
  )
}
