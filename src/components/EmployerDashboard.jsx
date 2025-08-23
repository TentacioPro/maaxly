import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

export default function EmployerDashboard({ profile }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get('/api/opportunities/my', { headers: { Authorization: `Bearer ${token}` } })
        if (cancelled) return
        setListings(res.data.opportunities || [])
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
      <h2>Employer Dashboard</h2>
      <p>Welcome, {profile?.fullName || 'Employer'}</p>

      <section style={{ marginTop: 20 }}>
        <h3>My Listings</h3>
        {loading && <div>Loading listings...</div>}
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
        {!loading && !error && (
          <div style={{ display: 'grid', gap: 12 }}>
            {listings.map(o => (
              <div key={o._id || o.id} style={{ padding: 12, border: '1px solid #ccc', borderRadius: 6 }}>
                <strong>{o.title}</strong>
                <div style={{ color: '#555' }}>{o.description}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>{o.type}</div>
              </div>
            ))}
            {listings.length === 0 && <div>No listings yet.</div>}
          </div>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h3>Create New Opportunity</h3>
        <Link to="/create-opportunity"><button style={{ padding: '8px 12px' }}>Create Opportunity</button></Link>
      </section>
    </div>
  )
}
