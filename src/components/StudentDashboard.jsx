import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function StudentDashboard({ profile }) {
  const [recommended, setRecommended] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // placeholder applications until application logic is implemented
  const applications = [
    { id: 'app-1', title: 'Frontend Internship', company: 'Acme', status: 'Applied' },
    { id: 'app-2', title: 'Open Source Contributor', company: 'OSS Org', status: 'Interview' }
  ]

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await axios.get('/api/opportunities')
        if (cancelled) return
        setRecommended(res.data.opportunities || [])
      } catch (err) {
        if (cancelled) return
        setError(err.response?.data?.message || err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h2>Student Dashboard</h2>
      <p>Welcome, {profile?.fullName || 'Student'}</p>

      <section style={{ marginTop: 20 }}>
        <h3>My Applications</h3>
        <div style={{ display: 'grid', gap: 8, maxWidth: 800 }}>
          {applications.map(a => (
            <div key={a.id} style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6 }}>
              <strong>{a.title}</strong>
              <div>{a.company} — <em>{a.status}</em></div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3>Recommended Opportunities</h3>
        {loading && <div>Loading opportunities...</div>}
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
        {!loading && !error && (
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginTop: 12 }}>
            {recommended.map(op => (
              <div key={op._id || op.id} style={{ padding: 12, border: '1px solid #ccc', borderRadius: 6, background: '#fff' }}>
                <h4 style={{ margin: '0 0 6px' }}>{op.title}</h4>
                <div style={{ color: '#555' }}>{op.description}</div>
              </div>
            ))}
            {recommended.length === 0 && <div>No opportunities found.</div>}
          </div>
        )}
      </section>
    </div>
  )
}
