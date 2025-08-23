import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

export default function ListingDetailsPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [opportunity, setOpportunity] = useState(null)
  const [applicants, setApplicants] = useState([])
  const [error, setError] = useState(null)
  const [applying, setApplying] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [oppRes, appsRes] = await Promise.all([
          axios.get(`/api/opportunities/${id}`),
          axios.get(`/api/opportunities/${id}/applicants`)
        ])
        if (cancelled) return
        setOpportunity(oppRes.data.opportunity)
        setApplicants(appsRes.data.applicants || [])
      } catch (err) {
        if (cancelled) return
        setError(err.response?.data?.message || err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>
  if (error) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>
  if (!opportunity) return <div style={{ padding: 24 }}>Opportunity not found</div>

  return (
    <div style={{ padding: 24 }}>
      <h2>{opportunity.title}</h2>
      <div style={{ color: '#555' }}>{opportunity.description}</div>
      <div style={{ marginTop: 8 }}><strong>Type:</strong> {opportunity.type}</div>
      <div style={{ marginTop: 8 }}><strong>Location:</strong> {opportunity.location || '—'}</div>
      <div style={{ marginTop: 12 }}>
        <h3>Applicants ({applicants.length})</h3>
        {applicants.length === 0 && <div>No applicants yet.</div>}
        <ul>
          {applicants.map(a => (
            <li key={a._id}>
              <strong>{a.applicant?.email || a.applicant?._id}</strong>
              <div style={{ fontSize: 13, color: '#444' }}>{a.coverLetter}</div>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 20 }}>
        {/* Show Apply button for authenticated students */}
        {typeof window !== 'undefined' && localStorage.getItem('token') && localStorage.getItem('role') === 'student' && (
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={async () => {
                setError(null)
                setSuccessMsg(null)
                setApplying(true)
                try {
                  await axios.post('/api/applications', { opportunityId: id })
                  setSuccessMsg('Application submitted')
                  // reload applicants (the employer won't see it immediately unless they refresh the listing as owner)
                  const appsRes = await axios.get(`/api/opportunities/${id}/applicants`)
                  setApplicants(appsRes.data.applicants || [])
                } catch (err) {
                  setError(err.response?.data?.message || err.message)
                } finally {
                  setApplying(false)
                }
              }}
              disabled={applying}
            >
              {applying ? 'Applying…' : 'Apply Now'}
            </button>
            {successMsg && <div style={{ color: 'green', marginTop: 8 }}>{successMsg}</div>}
          </div>
        )}

        <Link to="/dashboard">← Back to Dashboard</Link>
      </div>
    </div>
  )
}
