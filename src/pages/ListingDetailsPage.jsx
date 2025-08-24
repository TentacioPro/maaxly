import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { useToast } from '../components/ui/toast'

export default function ListingDetailsPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [opportunity, setOpportunity] = useState(null)
  const [applicants, setApplicants] = useState([])
  const [error, setError] = useState(null)
  const [applying, setApplying] = useState(false)
  const toast = useToast()
  const [hasApplied, setHasApplied] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const oppRes = await axios.get(`/api/opportunities/${id}`)
        if (cancelled) return
        setOpportunity(oppRes.data.opportunity)

        // Try to fetch applicants but tolerate 403 (forbidden) when the current
        // user is not allowed to see applicants. If there's no token, skip the
        // protected call (anonymous users can't see applicants) and show the
        // opportunity regardless.
        try {
          const localToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
          if (!localToken) {
            if (!cancelled) setApplicants([])
          } else {
            const headers = { Authorization: `Bearer ${localToken}` }
            const appsRes = await axios.get(`/api/opportunities/${id}/applicants`, { headers })
            if (!cancelled) setApplicants(appsRes.data.applicants || [])
          }
        } catch (appsErr) {
          // If forbidden, ignore and keep applicants empty; if unauthorized,
          // show a friendly missing-token message; otherwise surface error
          if (appsErr.response?.status === 403) {
            if (!cancelled) setApplicants([])
          } else if (appsErr.response?.status === 401) {
            if (!cancelled) toast.push({ title: 'Missing token', description: 'Missing or invalid token', variant: 'destructive' })
          } else {
            throw appsErr
          }
        }
        // If token present, check whether the current user already applied to this opp
        try {
          const localToken2 = typeof window !== 'undefined' ? localStorage.getItem('token') : null
          if (localToken2) {
            const checkRes = await axios.get('/api/applications/check', { params: { opportunityId: id }, headers: { Authorization: `Bearer ${localToken2}` } })
            if (!cancelled) setHasApplied(!!checkRes.data.applied)
          }
        } catch (checkErr) {
          // ignore
        }
      } catch (err) {
        if (cancelled) return
        const msg = err.response?.data?.message || err.message
        toast.push({ title: 'Load failed', description: msg, variant: 'destructive' })
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

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
  return (
    <div className="w-full md:w-[80%] mx-auto px-3 py-6">
      <Card className="border bg-card text-card-foreground">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate" title={opportunity.title}>{opportunity.title}</h2>
              <div className="text-xs text-muted-foreground mt-1">Skill set: {opportunity.skills || '—'}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{opportunity.type}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="text-sm text-muted-foreground mb-3">{opportunity.description || '—'}</div>
          <div className="text-sm"><strong>Type:</strong> <span className="ml-1">{opportunity.type}</span></div>
          <div className="text-sm mt-2"><strong>Location:</strong> <span className="ml-1">{opportunity.location || '—'}</span></div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold">Applicants ({applicants.length})</h3>
            {applicants.length === 0 && <div className="text-sm text-muted-foreground mt-2">No applicants yet.</div>}
            {applicants.length > 0 && (
              <div className="mt-3 space-y-2">
                {applicants.map(a => (
                  <Card key={a._id} className="border bg-card">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium">{a.applicant?.email || a.applicant?._id}</div>
                          <div className="text-xs text-muted-foreground mt-1">{a.coverLetter}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <div className="flex items-center justify-between w-full">
            <div>
              {token && role === 'student' && (
                <div>
                  <Button
                    onClick={async () => {
                      setError(null)
                      setApplying(true)
                        try {
                        const localToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
                        if (!localToken) {
                          window.location.href = '/login'
                          return
                        }
                        const headers = { Authorization: `Bearer ${localToken}` }
                        const res = await axios.post('/api/applications', { opportunityId: id }, { headers })
                        toast.push({ title: 'Application submitted', description: 'Your application was received.' })
                        setHasApplied(true)
                        const appsRes = await axios.get(`/api/opportunities/${id}/applicants`, { headers })
                        setApplicants(appsRes.data.applicants || [])
                        // let other components know the new count
                        const updatedCount = res.data?.applicationsCount ?? (appsRes.data?.applicants?.length || 0)
                        try { window.dispatchEvent(new CustomEvent('applicationsCountUpdated', { detail: { opportunityId: id, applicationsCount: updatedCount } })) } catch (e) {}
                      } catch (err) {
                        const msg = err.response?.data?.message || err.message
                        toast.push({ title: 'Apply failed', description: msg, variant: 'destructive' })
                      } finally {
                        setApplying(false)
                      }
                    }}
                    disabled={applying || hasApplied}
                  >
                    {hasApplied ? 'Applied' : applying ? 'Applying…' : 'Apply Now'}
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Link to="/dashboard" className="text-sm underline">← Back to Dashboard</Link>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
