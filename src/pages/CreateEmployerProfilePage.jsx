import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function CreateEmployerProfilePage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!fullName.trim()) e.fullName = 'Full name is required.'
    if (!companyName.trim()) e.companyName = 'Company name is required.'
    if (companyWebsite) {
      try {
        // eslint-disable-next-line no-new
        new URL(companyWebsite)
      } catch (_) {
        e.companyWebsite = 'Company website must be a valid URL.'
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)
    if (!validate()) return
    setLoading(true)
    try {
      const payload = { fullName, companyName, companyWebsite }
      const token = localStorage.getItem('token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      await axios.post('/api/profile/employer', payload, { headers })
      setMessage({ type: 'success', text: 'Employer profile saved.' })
      setTimeout(() => navigate('/opportunities'), 700)
    } catch (err) {
      console.error(err)
      const text = err?.response?.data?.message || err.message || 'Request failed.'
      setMessage({ type: 'error', text })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: 12 }}>
      <h2>Create Employer Profile</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Full name</label>
          <br />
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
          {errors.fullName && <div style={{ color: 'crimson' }}>{errors.fullName}</div>}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Company name</label>
          <br />
          <input
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
          {errors.companyName && <div style={{ color: 'crimson' }}>{errors.companyName}</div>}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Company website</label>
          <br />
          <input
            type="url"
            value={companyWebsite}
            onChange={e => setCompanyWebsite(e.target.value)}
            style={{ width: '100%', padding: 8 }}
            placeholder="https://example.com"
          />
          {errors.companyWebsite && <div style={{ color: 'crimson' }}>{errors.companyWebsite}</div>}
        </div>

        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={loading} style={{ padding: '10px 16px' }}>
            {loading ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </form>

      {message && (
        <div style={{ marginTop: 12, color: message.type === 'error' ? 'crimson' : 'green' }}>{message.text}</div>
      )}
    </div>
  )
}
