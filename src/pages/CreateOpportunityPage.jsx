import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function CreateOpportunityPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('job')
  const [location, setLocation] = useState('')
  const [applicationDeadline, setApplicationDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!title || !type) {
      setError('Please provide title and type')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      setError('You must be logged in as an employer to create an opportunity')
      return
    }

    const payload = {
      title,
      description,
      type,
      location,
      applicationDeadline: applicationDeadline || undefined
    }

    setLoading(true)
    try {
      await axios.post('/api/opportunities', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      // on success, redirect to dashboard and mark for refresh
      navigate('/dashboard', { state: { fromCreate: true } })
    } catch (err) {
      console.error('Create opportunity error', err)
      const msg = err?.response?.data?.message || err.message || 'Failed to create opportunity'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '24px auto', padding: 16 }}>
      <h2>Create Opportunity</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Title</label>
          <br />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: 8 }}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Description</label>
          <br />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Type</label>
          <br />
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: 8 }}>
            <option value="job">Job</option>
            <option value="internship">Internship</option>
            <option value="competition">Competition</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Location</label>
          <br />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Application Deadline</label>
          <br />
          <input
            type="date"
            value={applicationDeadline}
            onChange={(e) => setApplicationDeadline(e.target.value)}
            style={{ padding: 8 }}
          />
        </div>

        {error && (
          <div style={{ marginBottom: 12, color: 'crimson' }}>{error}</div>
        )}

        <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
          {loading ? 'Creating…' : 'Create Opportunity'}
        </button>
      </form>
    </div>
  )
}
