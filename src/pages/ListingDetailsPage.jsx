import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { useToast } from '../components/ui/toast'
import { ChevronLeft } from 'lucide-react'
import ApplicationStatusStepper from '@/components/ApplicationStatusStepper'
import { Skeleton } from '@/components/ui/skeleton'
import ApplicantProfileModal from '@/components/ApplicantProfileModal'

export default function ListingDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [opportunity, setOpportunity] = useState(null)
  const [applicants, setApplicants] = useState([])
  const [error, setError] = useState(null)
  const [applying, setApplying] = useState(false)
  const toast = useToast()
  const [hasApplied, setHasApplied] = useState(false)
  const [applicationMeta, setApplicationMeta] = useState(null)
  const [insights, setInsights] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState(null)
  const [viewApplicationId, setViewApplicationId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const oppRes = await axios.get(`/api/opportunities/${id}`)
        if (cancelled) return
        setOpportunity(oppRes.data.opportunity)
        // Track a detail view (fire and forget, ignore errors)
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            if (token) {
              axios.post(`/api/opportunities/${id}/track`, { type: 'detail' }, { headers: { Authorization: `Bearer ${token}` } }).catch(()=>{})
            }
        } catch (e) {}

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
            // Instead of only checking existence, fetch full list and filter for richer status & history
            try {
              const myApps = await axios.get('/api/applications/my', { headers: { Authorization: `Bearer ${localToken2}` } })
              const match = (myApps.data.applications || []).find(a => String(a.opportunity?._id || a.opportunity) === String(id))
              if (!cancelled && match) { setHasApplied(true); setApplicationMeta(match) }
            } catch (inner) {
              // fallback to simple applied check
              const checkRes = await axios.get('/api/applications/check', { params: { opportunityId: id }, headers: { Authorization: `Bearer ${localToken2}` } })
              if (!cancelled) setHasApplied(!!checkRes.data.applied)
            }
          }
        } catch (checkErr) {
          // ignore
        }

        // Insights (employer or admin) full dashboard
        try {
          const localRole3 = typeof window !== 'undefined' ? localStorage.getItem('role') : null
          const localToken3 = typeof window !== 'undefined' ? localStorage.getItem('token') : null
          if (localToken3 && (localRole3 === 'employer' || localRole3 === 'admin')) {
            setInsightsLoading(true)
            try {
              const res = await axios.get(`/api/opportunities/${id}/insights?full=1`, { headers: { Authorization: `Bearer ${localToken3}` } })
              if (!cancelled) setInsights(res.data.insights || null)
            } catch (insErr) {
              if (!cancelled) setInsightsError(insErr.response?.status === 403 ? null : (insErr.response?.data?.message || insErr.message))
            } finally {
              if (!cancelled) setInsightsLoading(false)
            }
          }
        } catch (e) {}
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
    <div className="w-full mx-auto max-w-[1400px] px-4 py-6 space-y-8">
      <Card className="border bg-card text-card-foreground">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                aria-label="Back to opportunities"
                className="inline-flex items-center justify-center h-8 w-8 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  // If we navigated here from an opportunities list click, use history.back() to preserve exact scroll
                  const fromList = typeof window !== 'undefined' && sessionStorage.getItem('opps:lastFromList')
                  if (fromList) {
                    try { sessionStorage.removeItem('opps:lastFromList') } catch (e) {}
                    window.history.back()
                  } else {
                    // Otherwise go to /opportunities and signal the list to restore once if we have a stored scrollY
                    try { sessionStorage.setItem('opps:restoreOnce', '1') } catch (e) {}
                    navigate('/opportunities')
                  }
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold truncate" title={opportunity.title}>{opportunity.title}</h2>
                <div className="text-xs text-muted-foreground mt-1">Skill set: {opportunity.skillset || opportunity.skills || '—'}</div>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="muted" className="capitalize">{opportunity.type}</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="text-sm text-muted-foreground mb-3">{opportunity.description || '—'}</div>
          {opportunity.companyWebsite && (
            <div className="mb-6">
              <a
                href={opportunity.companyWebsite}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  try {
                    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
                    if (token) {
                      axios.post(`/api/opportunities/${id}/track`, { type: 'companySite' }, { headers: { Authorization: `Bearer ${token}` } }).catch(()=>{})
                    }
                  } catch (e) {}
                }}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition"
              >Visit Company Site</a>
            </div>
          )}
          {hasApplied && (
            <div className="mb-6 p-3 rounded-md border bg-card/60">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Your Application Status</div>
              <ApplicationStatusStepper status={applicationMeta?.status || 'applied'} />
              {applicationMeta?.history?.length > 0 && (
                <ul className="mt-3 space-y-1 text-[11px]">
                  {applicationMeta.history.slice().reverse().map((h,i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary/70" />
                      <span className="capitalize font-medium">{h.status}</span>
                      <span className="text-muted-foreground text-[10px]">{new Date(h.at || h.createdAt || applicationMeta.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="text-sm"><strong>Type:</strong> <span className="ml-1">{opportunity.type}</span></div>
          <div className="text-sm mt-2"><strong>Location:</strong> <span className="ml-1">{opportunity.location || '—'}</span></div>
          {role === 'employer' || role === 'admin' ? (
            <div className="mt-8">
              <h3 className="text-sm font-semibold mb-3">Opportunity Insights</h3>
              {insightsLoading && (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    {Array.from({ length:4 }).map((_,i)=><div key={i} className="p-3 rounded border bg-card"><Skeleton className="h-4 w-1/2 mb-2" /><Skeleton className="h-8 w-16" /><Skeleton className="h-2 w-full mt-2" /></div>)}
                  </div>
                  <Skeleton className="h-40 w-full" />
                </div>
              )}
              {insightsError && <div className="text-sm text-destructive">{insightsError}</div>}
              {insights && !insightsLoading && (
                <div className="space-y-10">
                  {/* KPI cards */}
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="p-3 border rounded bg-card"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Applicants</div><div className="text-2xl font-semibold mt-1">{insights.applicantsTotal}</div></div>
                    <div className="p-3 border rounded bg-card"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Detail Views</div><div className="text-2xl font-semibold mt-1">{insights.detailViews}</div></div>
                    <div className="p-3 border rounded bg-card"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Site Clicks</div><div className="text-2xl font-semibold mt-1">{insights.companySiteViews}</div></div>
                    <div className="p-3 border rounded bg-card"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Conversion</div><div className="text-2xl font-semibold mt-1">{insights.detailViews ? Math.round((insights.applicantsTotal/Math.max(1,insights.detailViews))*100) : 0}%</div></div>
                  </div>
                  {/* Distribution charts */}
                  <div className="grid gap-8 lg:grid-cols-2">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Regional Distribution</h4>
                      <BarList data={insights.regions} colorVar="--primary" />
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Skill Distribution</h4>
                      <BarList data={insights.skills} colorVar="--accent" />
                    </div>
                  </div>
                  {/* Applicants table */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Applicants ({insights.applicantsTotal})</h4>
                    {(!insights.applicants || insights.applicants.length === 0) && <div className="text-xs text-muted-foreground">No applicants yet.</div>}
                    {insights.applicants && insights.applicants.length > 0 && (
                      <div className="border rounded overflow-hidden">
                        <div className="grid grid-cols-6 bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground px-3 py-2">
                          <div>Name</div><div>Email</div><div>Location</div><div className="col-span-2">Skills</div><div>Match</div>
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y">
                          {insights.applicants.map(a => (
                            <button type="button" onClick={()=>setViewApplicationId(a.applicationId)} key={a.id} className="text-left grid grid-cols-6 px-3 py-2 text-xs items-start gap-2 bg-card/60 hover:bg-muted/50 transition">
                              <div className="font-medium truncate" title={a.name}>{a.name}</div>
                              <div className="truncate" title={a.email}>{a.email}</div>
                              <div className="truncate" title={a.location}>{a.location}</div>
                              <div className="col-span-2 flex flex-wrap gap-1">
                                {a.skills.slice(0,8).map(s => <span key={s} className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">{s}</span>)}
                                {a.skills.length > 8 && <span className="text-[10px] text-muted-foreground">+{a.skills.length-8} more</span>}
                              </div>
                              <div className="text-right font-medium"><span className="inline-block min-w-[36px] text-right">{a.matchPercent}%</span></div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
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
          )}
        </CardContent>

        <CardFooter>
          <div className="flex items-center justify-between w-full">
            <div>
              {token && role === 'student' && (
                <div>
                  {!hasApplied && (
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
                        // Prefer count from server response (safe for students)
                        let updatedCount = res.data?.applicationsCount
                        // Only owners/admins can see applicants; skip for students
                        try {
                          const localRole = typeof window !== 'undefined' ? localStorage.getItem('role') : null
                          if (localRole === 'employer' || localRole === 'admin') {
                            const appsRes = await axios.get(`/api/opportunities/${id}/applicants`, { headers })
                            setApplicants(appsRes.data.applicants || [])
                            if (updatedCount == null) {
                              updatedCount = appsRes.data?.applicants?.length || 0
                            }
                          }
                        } catch (appsErr) {
                          // Ignore 401/403 here; students aren't allowed to read applicants
                          if (!(appsErr?.response?.status === 401 || appsErr?.response?.status === 403)) {
                            // For other errors, show a soft toast but don't mark apply as failed
                            toast.push({ title: 'Applicants refresh failed', description: appsErr.message, variant: 'destructive' })
                          }
                        }
                        // let other components know the new count
                        if (typeof updatedCount !== 'number') {
                          updatedCount = applicants?.length || 0
                        }
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
                    {applying ? 'Applying…' : 'Apply Now'}
                  </Button>)}
                  {hasApplied && (
                    <Badge variant="outline" className="px-3 py-1 text-xs">Applied</Badge>
                  )}
                </div>
              )}
            </div>

            {/* Back to dashboard link removed as requested */}
          </div>
        </CardFooter>
      </Card>
      {viewApplicationId && (
        <ApplicantProfileModal applicationId={viewApplicationId} onClose={()=>setViewApplicationId(null)} />
      )}
    </div>
  )
}

// Inline lightweight bar list component
function BarList({ data, colorVar='--primary' }) {
  const entries = Object.entries(data || {})
  if (!entries.length) return <div className="text-xs text-muted-foreground">No data</div>
  const max = Math.max(0, ...entries.map(([,v]) => v))
  return (
    <div className="space-y-2">
      {entries.map(([label,val]) => {
        const pct = max ? (val / max) * 100 : 0
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex-1 h-3 rounded bg-muted overflow-hidden relative">
              <div className="absolute inset-y-0 left-0" style={{ width: pct + '%', background: `hsl(var(${colorVar}))` }} />
            </div>
            <div className="w-40 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="truncate max-w-[110px]" title={label}>{label}</span>
              <span className="font-medium text-foreground">{val}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
