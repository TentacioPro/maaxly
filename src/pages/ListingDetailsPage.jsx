import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { useToast } from '../components/ui/toast'
import { ChevronLeft, MapPin, Timer } from 'lucide-react'
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
  const [attachments, setAttachments] = useState([])
  const [uploadingAtt, setUploadingAtt] = useState(false)
  const [kpis, setKpis] = useState({ detail: 0, site: 0 })

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
              axios.post(`/api/opportunities/${id}/track`, { event: 'detail' }, { headers: { Authorization: `Bearer ${token}` } }).catch(()=>{})
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

        // Attachments list (auth required)
        try {
          const tokenA = typeof window !== 'undefined' ? localStorage.getItem('token') : null
          if (tokenA) {
            const listRes = await axios.get(`/api/opportunities/${id}/attachments`, { headers: { Authorization: `Bearer ${tokenA}` } })
            if (!cancelled) setAttachments(listRes.data.attachments || [])
          }
        } catch (_) {}

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

  // Live analytics via SSE for owner/admin
  useEffect(() => {
    const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token || (role !== 'employer' && role !== 'admin')) return
    const es = new EventSource(`/api/events/stream?token=${encodeURIComponent(token)}`)
    const handler = (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload && String(payload.opportunityId) === String(id)) {
          setKpis({ detail: payload.detailViews || 0, site: payload.companySiteViews || 0 })
        }
      } catch (_) {}
    }
    es.addEventListener('analytics', handler)
    es.addEventListener('error', () => { try { es.close() } catch(_){ } })
    return () => { try { es.removeEventListener('analytics', handler); es.close() } catch(_){} }
  }, [id])

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>
  if (error) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>
  if (!opportunity) return <div style={{ padding: 24 }}>Opportunity not found</div>

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
  return (
    <div className="w-full mx-auto max-w-[1440px] px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            aria-label="Back to opportunities"
            className="inline-flex items-center justify-center h-9 w-9 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              const fromList = typeof window !== 'undefined' && sessionStorage.getItem('opps:lastFromList')
              if (fromList) {
                try { sessionStorage.removeItem('opps:lastFromList') } catch (e) {}
                window.history.back()
              } else {
                try { sessionStorage.setItem('opps:restoreOnce', '1') } catch (e) {}
                navigate('/opportunities')
              }
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold truncate" title={opportunity.title}>{opportunity.title}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              {opportunity.location && <span className="inline-flex items-center gap-1.5"><MapPin size={16} className="opacity-80" />{opportunity.location}</span>}
              {opportunity.applicationDeadline && <span className="inline-flex items-center gap-1.5"><Timer size={16} className="opacity-80" />Apply before: {new Date(opportunity.applicationDeadline).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <Badge variant="muted" className="capitalize rounded-full px-3 py-1">{opportunity.type}</Badge>
        </div>
      </div>

      {/* Body: 60/40 layout (left text, right cards) */}
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Left column: text content */}
  <div className="w-full sm:w-7/12 min-w-0">
          <Card className="border bg-card">
            <CardHeader className="pb-2"><h2 className="text-base font-semibold">Job Summary</h2></CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="prose prose-sm max-w-none text-foreground/90">
                {opportunity.description ? (
                  <p className="leading-7 whitespace-pre-line">{opportunity.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No description provided.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: stacked cards */}
  <div className="space-y-4 w-full sm:w-5/12 sm:shrink-0">
          {/* Apply Card */}
          <Card className="border bg-muted/30">
            <CardContent className="p-4">
              {token && role === 'student' && (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">Ready to apply?</div>
                  {!hasApplied ? (
                    <Button
                      onClick={async () => {
                        setError(null)
                        setApplying(true)
                        try {
                          const localToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
                          if (!localToken) { window.location.href = '/login'; return }
                          const headers = { Authorization: `Bearer ${localToken}` }
                          const res = await axios.post('/api/applications', { opportunityId: id }, { headers })
                          toast.push({ title: 'Application submitted', description: 'Your application was received.' })
                          setHasApplied(true)
                        } catch (err) {
                          const msg = err.response?.data?.message || err.message
                          toast.push({ title: 'Apply failed', description: msg, variant: 'destructive' })
                        } finally {
                          setApplying(false)
                        }
                      }}
                      disabled={applying}
                    >
                      {applying ? 'Applying…' : 'Apply Now'}
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="rounded-full">Applied</Badge>
                  )}
                </div>
              )}
              {!token && (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">Login to apply</div>
                  <Button asChild><a href="/login">Login</a></Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meta cards */}
          <Card className="border bg-card">
            <CardHeader className="pb-2"><h3 className="text-sm font-semibold">About the job</h3></CardHeader>
            <CardContent className="p-4 pt-0 space-y-2 text-sm">
              {opportunity.applicationDeadline && (
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Apply before</span><span className="font-medium">{new Date(opportunity.applicationDeadline).toLocaleDateString()}</span></div>
              )}
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Posted on</span><span className="font-medium">{new Date(opportunity.createdAt || opportunity.updatedAt).toLocaleDateString()}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Job type</span><span className="font-medium capitalize">{opportunity.type}</span></div>
            </CardContent>
          </Card>

          {(role === 'employer' || role === 'admin') && (
            <Card className="border bg-card">
              <CardHeader className="pb-2"><h3 className="text-sm font-semibold">Attachments</h3></CardHeader>
              <CardContent className="p-4 pt-0 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground">Share job spec, benefits PDF, etc.</div>
                  <label className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded bg-primary text-primary-foreground cursor-pointer">
                    <input type="file" className="hidden" onChange={async (e)=>{
                      const f = e.target.files && e.target.files[0]
                      if (!f) return
                      setUploadingAtt(true)
                      try {
                        const token = localStorage.getItem('token')
                        const fd = new FormData()
                        fd.append('file', f)
                        const res = await axios.post(`/api/opportunities/${id}/attachments`, fd, { headers: { Authorization: `Bearer ${token}` } })
                        setAttachments(prev => [res.data.attachment, ...prev])
                      } catch (err) {
                        const msg = err.response?.data?.message || err.message
                        toast.push({ title: 'Upload failed', description: msg, variant: 'destructive' })
                      } finally { setUploadingAtt(false); e.target.value = '' }
                    }} />
                    {uploadingAtt ? 'Uploading…' : 'Upload'}
                  </label>
                </div>
                <ul className="space-y-2">
                  {attachments.length ? attachments.map(a => (
                    <li key={String(a.fileId)} className="flex items-center justify-between gap-2">
                      <div className="truncate" title={a.filename}>{a.filename}</div>
                      <a className="text-xs text-primary hover:underline" href={`/api/opportunities/${id}/attachments/${a.fileId}`} target="_blank" rel="noreferrer">View</a>
                    </li>
                  )) : <div className="text-xs text-muted-foreground">No attachments yet.</div>}
                </ul>
              </CardContent>
            </Card>
          )}

          {opportunity.location && (
            <Card className="border bg-card">
              <CardHeader className="pb-2"><h3 className="text-sm font-semibold">Location Requirements</h3></CardHeader>
              <CardContent className="p-4 pt-0 text-sm flex items-center gap-2"><MapPin size={16} />{opportunity.location}</CardContent>
            </Card>
          )}

          {(opportunity.skillset || opportunity.skills) && (
            <Card className="border bg-card">
              <CardHeader className="pb-2"><h3 className="text-sm font-semibold">Skills</h3></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {(opportunity.skillset || opportunity.skills).split(',').map(s=>s.trim()).filter(Boolean).slice(0,24).map(s => (
                    <Badge key={s} variant="outline" className="rounded-md capitalize">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hiring Timezones */}
          <Card className="border bg-card">
            <CardHeader className="pb-2"><h3 className="text-sm font-semibold">Hiring Timezones</h3></CardHeader>
            <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
              {Array.isArray(opportunity.timezones) && opportunity.timezones.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {opportunity.timezones.map(z => <Badge key={z} variant="outline" className="rounded-md">{z}</Badge>)}
                </div>
              ) : (
                <div>—</div>
              )}
            </CardContent>
          </Card>

          {/* Job Categories */}
          <Card className="border bg-card">
            <CardHeader className="pb-2"><h3 className="text-sm font-semibold">Job Categories</h3></CardHeader>
            <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
              {Array.isArray(opportunity.categories) && opportunity.categories.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {opportunity.categories.map(c => <Badge key={c} variant="outline" className="rounded-md capitalize">{c}</Badge>)}
                </div>
              ) : (
                <div>—</div>
              )}
            </CardContent>
          </Card>

          {/* Salary */}
          <Card className="border bg-card">
            <CardHeader className="pb-2"><h3 className="text-sm font-semibold">Salary</h3></CardHeader>
            <CardContent className="p-4 pt-0 text-sm">
              <div className="font-medium">{opportunity.salary || '—'}</div>
            </CardContent>
          </Card>

          {role === 'employer' || role === 'admin' ? (
            <div className="mt-2">
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
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="p-3 border rounded bg-card"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Applicants</div><div className="text-2xl font-semibold mt-1">{insights.applicantsTotal}</div></div>
                    <div className="p-3 border rounded bg-card"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Detail Views</div><div className="text-2xl font-semibold mt-1">{kpis.detail || insights.detailViews}</div></div>
                    <div className="p-3 border rounded bg-card"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Site Clicks</div><div className="text-2xl font-semibold mt-1">{kpis.site || insights.companySiteViews}</div></div>
                    <div className="p-3 border rounded bg-card"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Conversion</div><div className="text-2xl font-semibold mt-1">{insights.detailViews ? Math.round((insights.applicantsTotal/Math.max(1,insights.detailViews))*100) : 0}%</div></div>
                  </div>
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
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

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
