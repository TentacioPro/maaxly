import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { get } from '@/lib/api'
import { useToast } from './ui/toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card'
import DashboardKPI from './DashboardKPI'
import { Skeleton } from './ui/skeleton'
import { Modal, ModalHeader, ModalBody, ModalTitle, ModalDescription } from './ui/modal'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import createSSEClient from '@/hooks/useSSE'
import { Loader2 } from 'lucide-react'

export default function EmployerDashboard({ profile, fromCreate }) {
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const [overview, setOverview] = useState(null)
  const [overviewError, setOverviewError] = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [detailModal, setDetailModal] = useState(null)
  const [applicantsState, setApplicantsState] = useState({ loading: false, error: null, rows: [], loaded: false })

  async function load() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
    const res = await axios.get('/api/opportunities/my', { headers: { Authorization: `Bearer ${token}` } })
    setListings(res.data.opportunities || [])
    } catch (err) {
  const msg = err.response?.data?.message || err.message
  toast.push({ title: 'Load failed', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // re-load when coming back from create page
  }, [fromCreate])

  // SSE wiring: start when token present
  const sse = useMemo(() => createSSEClient({ onMessageCreated: null, onConversationCreated: null, onAck: null }), [])
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return
    sse.start()
    return () => sse.stop()
  }, [sse])

  // keep metrics live when application counts update elsewhere
  useEffect(() => {
    function onUpdate(e) {
      const { opportunityId, applicationsCount } = e.detail || {}
      if (!opportunityId) return
      const cid = String(opportunityId)
      setListings(prev => prev.map(o => ((String(o._id) === cid || String(o.id) === cid) ? { ...o, applicationsCount } : o)))
    }
    window.addEventListener('applicationsCountUpdated', onUpdate)
    return () => window.removeEventListener('applicationsCountUpdated', onUpdate)
  }, [])

  // react to backend-sent overview updates (finer-grained metrics)
  useEffect(() => {
    function onOverviewUpdate(e) {
      const payload = e.detail || {}
      setOverview(prev => ({ ...(prev || {}), ...(payload.overview || {}) }))
    }
    window.addEventListener('employerOverviewUpdated', onOverviewUpdate)
    return () => window.removeEventListener('employerOverviewUpdated', onOverviewUpdate)
  }, [])

  // derive basic local metrics & remote overview
  const metrics = useMemo(() => {
    const baseListings = listings.length
    const baseApplicants = listings.reduce((sum, o) => sum + (o.applicationsCount || 0), 0)
    const baseByType = listings.reduce((acc, o) => {
      const t = (o.type || 'other').toLowerCase()
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})
    const baseViews = listings.reduce((sum, o) => sum + (o.detailViews || 0), 0)
    const lastCreatedAt = listings.reduce((max, o) => {
      const d = o.createdAt ? new Date(o.createdAt).getTime() : 0
      return Math.max(max, d)
    }, 0)
    const totalListings = overview?.totalListings ?? baseListings
    const totalApplicants = overview?.totalApplicants ?? baseApplicants
    const byType = overview?.byType ?? baseByType
    const avgApplicantsPerListing = overview?.avgApplicantsPerListing ?? (totalListings ? (totalApplicants / totalListings) : 0)
    const totalViews = overview?.activity?.totalViews
      ?? overview?.funnel?.views
      ?? baseViews
    return { totalListings, totalApplicants, byType, lastCreatedAt, avgApplicantsPerListing, totalViews }
  }, [listings, overview])

  const funnel = overview?.funnel || null
  const topListings = overview?.topListings || []
  const topSkills = overview?.topSkills || []
  const engagementNotes = overview?.engagementNotes || []
  const recentApplicants = overview?.recentApplicants || []
  const activity = overview?.activity || {}

  const funnelValues = funnel ? [funnel.views || 0, funnel.siteVisits || 0, funnel.applies || 0] : []
  const funnelMax = funnelValues.length ? Math.max(...funnelValues) || 1 : 1
  const funnelRows = [
    { key: 'views', label: 'Listing views', value: funnel?.views ?? 0, caption: null },
    {
      key: 'site',
      label: 'Company site visits',
      value: funnel?.siteVisits ?? 0,
      caption: funnel?.viewToSiteRate != null ? `${Math.round(funnel.viewToSiteRate * 100)}% from views` : null
    },
    {
      key: 'applies',
      label: 'Applications',
      value: funnel?.applies ?? 0,
      caption: funnel?.viewToApplyRate != null ? `${Math.round(funnel.viewToApplyRate * 100)}% from views` : null
    }
  ]
  const hasFunnelData = funnelRows.some((row) => row.value > 0)

  const formatRelative = useCallback((input) => {
    if (!input) return ''
    const ts = typeof input === 'number' ? input : new Date(input).getTime()
    if (!ts || Number.isNaN(ts)) return ''
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    const weeks = Math.floor(days / 7)
    if (weeks < 4) return `${weeks}w ago`
    const months = Math.floor(days / 30)
    return `${months}mo ago`
  }, [])

  const formatDate = useCallback((input) => {
    if (!input) return '—'
    const date = new Date(input)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString()
  }, [])

  const handleApplicantClick = useCallback((row) => {
    if (!row) return
    const username = row.applicantProfile?.username
    const publicId = row.applicantProfile?.publicId
    setDetailModal(null)
    if (username) {
      navigate(`/u/${username}`)
      return
    }
    if (publicId) {
      navigate(`/s/${publicId}`)
    }
  }, [navigate])

  const handleListingClick = useCallback((row) => {
    if (!row?.opportunityId) return
    setDetailModal(null)
    navigate(`/dashboard/listing/${row.opportunityId}`)
  }, [navigate])

  const refreshApplicants = useCallback(() => {
    setApplicantsState({ loading: false, error: null, rows: [], loaded: false })
  }, [])

  const detailModalContent = useMemo(() => {
    if (!detailModal) return null

    if (detailModal === 'listings') {
      return (
        <Modal open onClose={() => setDetailModal(null)} className="max-w-5xl">
          <ModalHeader>
            <div>
              <ModalTitle>All Listings</ModalTitle>
              <ModalDescription>Click a row to jump into that listing&apos;s analytics.</ModalDescription>
            </div>
          </ModalHeader>
          <ModalBody className="pb-6">
            {listings.length === 0 ? (
              <div className="rounded border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">No listings yet.</div>
            ) : (
              <div className="overflow-hidden rounded-2xl border">
                <div className="grid grid-cols-12 gap-2 bg-muted/40 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <div className="col-span-4">Listing</div>
                  <div className="col-span-2 text-center">Type</div>
                  <div className="col-span-2 text-center">Applicants</div>
                  <div className="col-span-2 text-center">Views</div>
                  <div className="col-span-2 text-right">Created</div>
                </div>
                <div className="max-h-[70vh] overflow-y-auto divide-y">
                  {listings.map((listing) => {
                    const listingId = String(listing._id || listing.id || '')
                    return (
                      <button
                        key={listingId}
                        type="button"
                        onClick={() => handleListingClick({ opportunityId: listingId })}
                        className="grid w-full grid-cols-12 gap-2 px-3 py-2 text-left text-xs transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        <div className="col-span-4 truncate">
                          <div className="font-medium text-foreground">{listing.title || 'Opportunity'}</div>
                          <div className="text-[11px] text-muted-foreground">{listing.location || '—'}</div>
                        </div>
                        <div className="col-span-2 text-center capitalize text-muted-foreground">{listing.type || '—'}</div>
                        <div className="col-span-2 text-center text-muted-foreground">{listing.applicationsCount ?? 0}</div>
                        <div className="col-span-2 text-center text-muted-foreground">{listing.detailViews ?? 0}</div>
                        <div className="col-span-2 text-right text-muted-foreground">{formatDate(listing.createdAt)}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </ModalBody>
        </Modal>
      )
    }

    if (detailModal === 'applicants') {
      const networkRows = applicantsState.rows || []
      const fallbackRows = (!networkRows.length && overview?.recentApplicants?.length)
        ? overview.recentApplicants.map((app) => ({
            id: app.id || String(app.opportunityId || app.createdAt || Math.random()),
            status: app.status || 'applied',
            createdAt: app.createdAt || null,
            opportunityId: app.opportunityId || null,
            opportunityTitle: app.opportunityTitle || 'Opportunity',
            opportunityType: app.opportunityType || null,
            matchPercent: app.matchPercent || null,
            applicant: {
              name: app.applicantName || app.applicantEmail || 'Applicant',
              email: app.applicantEmail || null
            },
            applicantProfile: app.applicantProfile || null
          }))
        : []
      const rows = networkRows.length ? networkRows : fallbackRows
      const usingFallback = !networkRows.length && rows.length > 0
      const totalApplicantsCount = metrics.totalApplicants ?? rows.length
      const formattedTotal = Number.isFinite(totalApplicantsCount)
        ? new Intl.NumberFormat().format(totalApplicantsCount)
        : '—'

      return (
        <Modal open onClose={() => setDetailModal(null)} className="max-w-5xl">
          <ModalHeader className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <ModalTitle className="text-lg font-semibold">All Applicants</ModalTitle>
              <ModalDescription className="text-sm">
                Review candidates sourced from all of your active listings.
              </ModalDescription>
              <div className="text-xs text-muted-foreground">
                Total applicants: {formattedTotal}
                {rows.length > 0 && (
                  <span className="ml-1">
                    · Showing {rows.length}{usingFallback ? ' (recent snapshot)' : ''}
                  </span>
                )}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={refreshApplicants} disabled={applicantsState.loading} className="gap-2">
              {applicantsState.loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {applicantsState.loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </ModalHeader>
          <ModalBody className="pb-6 space-y-4">
            {usingFallback && !networkRows.length && (
              <div className="rounded border border-dashed border-muted/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                Live applicant data is on the way; showing the latest snapshot from your metrics.
              </div>
            )}
            {applicantsState.loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : applicantsState.error ? (
              <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{applicantsState.error}</div>
            ) : rows.length === 0 ? (
              <div className="rounded border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                We haven&apos;t pulled any applicant records yet. Try refreshing in a moment.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border">
                <div className="grid grid-cols-12 gap-2 bg-muted/40 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <div className="col-span-3">Applicant</div>
                  <div className="col-span-3">Opportunity</div>
                  <div className="col-span-2 text-center">Status</div>
                  <div className="col-span-2 text-center">Applied</div>
                  <div className="col-span-2 text-right">Match</div>
                </div>
                <div className="max-h-[70vh] overflow-y-auto divide-y">
                  {rows.map((row) => (
                    <div key={row.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleApplicantClick(row)}
                        className="col-span-3 text-left text-foreground transition hover:text-primary"
                      >
                        <div className="font-medium">{row.applicant?.name || 'Applicant'}</div>
                        <div className="text-[11px] text-muted-foreground">{row.applicant?.email || '—'}</div>
                      </button>
                      <div className="col-span-3 flex flex-col gap-1 text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => handleListingClick(row)}
                          className="text-left text-primary hover:underline"
                        >
                          {row.opportunityTitle || 'Opportunity'}
                        </button>
                        <span className="text-[10px]">{row.opportunityType || '—'}</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <Badge variant={row.status === 'rejected' ? 'outline' : 'secondary'} className="text-[10px] capitalize">{row.status || 'applied'}</Badge>
                      </div>
                      <div className="col-span-2 text-center text-muted-foreground">{formatRelative(row.createdAt) || formatDate(row.createdAt)}</div>
                      <div className="col-span-2 text-right text-muted-foreground">{typeof row.matchPercent === 'number' ? `${Math.round(row.matchPercent)}%` : (row.applicantProfile?.headline || '—')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ModalBody>
        </Modal>
      )
    }

    return null
  }, [applicantsState, detailModal, formatDate, formatRelative, handleApplicantClick, handleListingClick, listings, metrics.totalApplicants, overview, refreshApplicants])

  useEffect(() => {
    let cancelled = false
    async function loadOverview() {
      setOverviewLoading(true)
      setOverviewError(null)
      try {
  const data = await get('/analytics/employer/overview')
  if (cancelled) return
  setOverview(data?.overview || data)
      } catch (e) {
        if (cancelled) return
        setOverviewError(e.message)
      } finally {
        if (!cancelled) setOverviewLoading(false)
      }
    }
    loadOverview()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (detailModal !== 'applicants') return
    if (applicantsState.loaded) return

    let cancelled = false

    setApplicantsState((prev) => ({ ...prev, loading: true, error: null }))

    async function loadApplicants() {
      try {
        const data = await get('/analytics/employer/applicants')
        if (cancelled) return
        const applicants = Array.isArray(data?.applicants) ? data.applicants : []
        setApplicantsState({ loading: false, error: null, rows: applicants, loaded: true })
      } catch (e) {
        if (cancelled) return
        setApplicantsState((prev) => ({ ...prev, loading: false, error: e?.message || 'Failed to load applicants', loaded: true }))
      }
    }

    loadApplicants()

    return () => {
      cancelled = true
    }
  }, [detailModal, applicantsState.loaded])

  // Quick Create removed

  return (
    <div className="px-4 py-6 space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Employer Dashboard</h2>
        <p className="text-muted-foreground text-sm">Welcome, {profile?.fullName || 'Employer'}</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} compact className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-2 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <DashboardKPI
              label="Total Listings"
              value={metrics.totalListings}
              accent="primary"
              onClick={() => setDetailModal('listings')}
            />
            <DashboardKPI
              label="Total Applicants"
              value={metrics.totalApplicants}
              accent="accent"
              onClick={() => setDetailModal('applicants')}
            />
            <DashboardKPI
              label="Avg Applicants / Listing"
              value={Number.isFinite(metrics.avgApplicantsPerListing) ? metrics.avgApplicantsPerListing.toFixed(1) : '0.0'}
              accent="secondary"
            />
            <Card compact className="overflow-hidden">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">By Type</div>
                <div className="text-sm text-foreground mt-1 space-y-1">
                  {Object.keys(metrics.byType).length === 0 && <div className="text-muted-foreground">—</div>}
                  {Object.entries(metrics.byType).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between"><span className="capitalize">{k}</span><span className="font-medium">{v}</span></div>
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-muted-foreground">Total views tracked: {metrics.totalViews ?? '—'}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Performance Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Performance Overview</CardTitle>
          <CardDescription>Live story of how talent engages with your listings.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          {overviewLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-3 w-32" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-2 w-full" />
                  ))}
                </div>
              </div>
            ))
          ) : overviewError ? (
            <div className="col-span-full rounded border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{overviewError}</div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="text-xs uppercase text-muted-foreground tracking-wide">Conversion funnel</div>
                <div className="space-y-3 text-xs">
                  {funnelRows.map((row) => (
                    <div key={row.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="text-foreground font-medium">{row.value}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                        <div
                          className="h-full bg-primary/70"
                          style={{ width: `${funnelMax ? Math.max(6, Math.round((row.value / funnelMax) * 100)) : 0}%` }}
                        />
                      </div>
                      {row.caption && <div className="text-[10px] text-muted-foreground">{row.caption}</div>}
                    </div>
                  ))}
                  {!hasFunnelData && <div className="rounded border border-dashed px-4 py-3 text-[11px] text-muted-foreground">We&apos;ll chart conversion once views and applications roll in.</div>}
                </div>
              </div>
              <div className="space-y-4">
                <div className="text-xs uppercase text-muted-foreground tracking-wide">Top listings</div>
                {topListings.length === 0 ? (
                  <div className="rounded border border-dashed px-4 py-3 text-xs text-muted-foreground">Publish an opportunity to start collecting insights.</div>
                ) : (
                  <div className="space-y-3 text-xs">
                    {topListings.slice(0, 3).map((listing) => (
                      <div key={listing.id} className="rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-medium text-foreground">{listing.title || 'Opportunity'}</div>
                            <div className="text-[11px] text-muted-foreground capitalize">{listing.type || '—'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-foreground">{listing.applications}</div>
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Applicants</div>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Views: {listing.detailViews ?? 0}</span>
                          <span>{listing.lastApplicationAt ? `Last applicant ${formatRelative(listing.lastApplicationAt)}` : 'Awaiting first applicant'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="text-xs uppercase text-muted-foreground tracking-wide">Engagement notes</div>
                {engagementNotes.length === 0 ? (
                  <div className="rounded border border-dashed px-4 py-3 text-xs text-muted-foreground">We&apos;ll surface insights as soon as applicants engage with your roles.</div>
                ) : (
                  <ul className="space-y-2 list-disc pl-4 text-xs text-muted-foreground">
                    {engagementNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                )}
                <div className="text-xs uppercase text-muted-foreground tracking-wide">Skill signals</div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {topSkills.length === 0 ? (
                    <span className="rounded-full border border-dashed border-border/60 px-3 py-1 text-muted-foreground">No skill signals yet</span>
                  ) : (
                    topSkills.map((skill) => (
                      <span key={skill.name} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary">
                        {skill.name}
                        <span className="ml-1 text-[10px] text-muted-foreground">×{skill.count}</span>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">Metrics refresh automatically when applicants or views change.</div>
        </CardFooter>
      </Card>

      {/* Applicants Snapshot & Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Applicants Snapshot</CardTitle>
            <CardDescription className="text-xs">Latest applicants pulled straight from MongoDB</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {overviewLoading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : recentApplicants.length === 0 ? (
              <div className="rounded border border-dashed px-3 py-3 text-muted-foreground">No applicants yet.</div>
            ) : (
              recentApplicants.map((app) => (
                <div key={app.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-3 py-2">
                  <div className="min-w-0 truncate">
                    <div className="truncate text-sm font-medium text-foreground">{app.applicantName || app.applicantEmail || 'Applicant'}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{app.opportunityTitle}</div>
                  </div>
                  <div className="text-right text-[11px] uppercase">
                    <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 ${app.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{app.status}</span>
                    <div className="mt-1 text-[10px] text-muted-foreground">{formatRelative(app.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Activity</CardTitle>
            <CardDescription className="text-xs">High-level signals captured from your listings</CardDescription>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            {overviewLoading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : (
              <ul className="space-y-1 list-disc pl-4 text-muted-foreground">
                <li>{activity.newApplicants24h || 0} new applicants in the last 24h</li>
                <li>{activity.newApplicants7d || 0} new applicants in the last 7 days</li>
                <li>Total listing views recorded: {activity.totalViews ?? metrics.totalViews ?? 0}</li>
                <li>Total company site visits: {funnel?.siteVisits ?? 0}</li>
                {activity.lastApplicationOpportunity && (
                  <li>Latest applicant: {activity.lastApplicationOpportunity} ({formatRelative(activity.lastApplicationAt)})</li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      {detailModalContent}
    </div>
  )
}
