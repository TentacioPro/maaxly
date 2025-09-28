import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { get, post } from '@/lib/api'
import createSSEClient from '@/hooks/useSSE'
import { Card, CardHeader, CardContent } from './ui/card'
import DashboardKPI from './DashboardKPI'
import { Badge } from './ui/badge'
import { Bookmark, BookmarkCheck, MapPin } from 'lucide-react'
import { Skeleton } from './ui/skeleton'
import ApplicationProgressStepper from '@/components/ApplicationProgressStepper'
import ApplicationStatusStepper from '@/components/ApplicationStatusStepper'
import OpportunityMiniTracker from '@/components/OpportunityMiniTracker'
import { cn } from '@/lib/utils'
import { Modal, ModalHeader, ModalBody, ModalTitle, ModalDescription } from '@/components/ui/modal'

const STAGE_ORDER = ['applied', 'screening', 'interview', 'offer', 'rejected']
const EMPTY_BREAKDOWN = {
  applied: 0,
  screening: 0,
  interview: 0,
  offer: 0,
  rejected: 0
}

const ACTIONABLE_STATS = new Set(['applications', 'interviews', 'offers', 'rejections'])
const STAT_STATUS_FILTERS = {
  interviews: ['screening', 'interview'],
  offers: ['offer'],
  rejections: ['rejected']
}
const STAT_TITLES = {
  applications: 'All Applications',
  interviews: 'Interview Pipeline',
  offers: 'Offers Received',
  rejections: 'Rejections'
}

export default function StudentDashboard({ profile }) {
  const [recommended, setRecommended] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [savedOpportunityIds, setSavedOpportunityIds] = useState(() => new Set())
  const [opportunityFilter, setOpportunityFilter] = useState('all')
  const [opportunitySort, setOpportunitySort] = useState('recent')
  const [statModal, setStatModal] = useState(null)

  useEffect(() => { loadRecommendations() }, [])

  // SSE: listen for student-specific analytics updates (if available)
  const sse = useMemo(() => createSSEClient({
    onMessageCreated: null,
    onConversationCreated: null,
    onAck: null
  }), [])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return
    sse.start()
    return () => sse.stop()
  }, [sse])

  async function loadRecommendations(manual = false) {
    let cancelled = false
    if (manual) setRefreshing(true); else setLoading(true)
    try {
      const res = await axios.get('/api/opportunities')
      if (cancelled) return
      setRecommended(res.data.opportunities || [])
      setError(null)
    } catch (err) {
      if (cancelled) return
      setError(err.response?.data?.message || err.message)
    } finally {
      manual ? setRefreshing(false) : setLoading(false)
    }
    return () => { cancelled = true }
  }

  // Remote stats & habits
  const [progress, setProgress] = useState({
    applications: 0,
    interviews: 0,
    offers: 0,
    rejected: 0,
    statusBreakdown: EMPTY_BREAKDOWN,
    lastActivityAt: null
  })
  const [streak, setStreak] = useState(0)
  const [tasks, setTasks] = useState([])
  const [habitsLoading, setHabitsLoading] = useState(true)
  const [habitsError, setHabitsError] = useState(null)
  const [applications, setApplications] = useState([])
  const [appsLoading, setAppsLoading] = useState(false)
  const [statusMetricMode, setStatusMetricMode] = useState('count')

  useEffect(() => {
    let cancelled = false
    async function loadProgress() {
      try {
        const data = await get('/analytics/student/progress')
        if (cancelled) return
        const incoming = data?.progress || {}
        setProgress({
          applications: incoming.applications || 0,
          interviews: incoming.interviews || 0,
          offers: incoming.offers || 0,
          rejected: incoming.rejected || 0,
          statusBreakdown: { ...EMPTY_BREAKDOWN, ...(incoming.statusBreakdown || {}) },
          lastActivityAt: incoming.lastActivityAt || null
        })
      } catch {}
    }
    loadProgress()
    return () => { cancelled = true }
  }, [])

  const extractSkillsFromSource = useCallback((source) => {
    if (!source) return []
    if (Array.isArray(source)) {
      return source
        .map((item) => {
          if (typeof item === 'string') return item
          if (item && typeof item === 'object') return item.name || item.label || item.title || ''
          return ''
        })
        .filter(Boolean)
    }
    if (typeof source === 'string') {
      return source
        .split(/[,/]|•|\n/)
        .map((part) => part.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
    }
    return []
  }, [])

  const getOpportunitySkillList = useCallback((opportunity) => {
    if (!opportunity) return []
    const skills = [
      ...extractSkillsFromSource(opportunity.skills),
      ...extractSkillsFromSource(opportunity.skillset)
    ]
    return Array.from(new Set(skills.map((skill) => skill.replace(/\s+/g, ' ').trim()).filter(Boolean)))
  }, [extractSkillsFromSource])

  // handle real-time progress updates (custom event stream may emit 'student:progress')
  useEffect(() => {
    function onProgressUpdate(e) {
      const payload = e.detail || {}
      if (payload.progress) {
        setProgress(prev => ({
          applications: payload.progress.applications ?? prev.applications,
          interviews: payload.progress.interviews ?? prev.interviews,
          offers: payload.progress.offers ?? prev.offers,
          rejected: payload.progress.rejected ?? prev.rejected,
          statusBreakdown: {
            ...prev.statusBreakdown,
            ...(payload.progress.statusBreakdown || {})
          },
          lastActivityAt: payload.progress.lastActivityAt ?? prev.lastActivityAt
        }))
      }
      if (payload.streak !== undefined) setStreak(payload.streak)
    }
    window.addEventListener('studentProgressUpdated', onProgressUpdate)
    return () => window.removeEventListener('studentProgressUpdated', onProgressUpdate)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadHabits() {
      setHabitsLoading(true)
      setHabitsError(null)
      try {
        const [streakData, tasksData] = await Promise.all([
          get('/habits/streak'),
          get('/habits/tasks')
        ])
        if (cancelled) return
  const rawStreak = streakData.streak
  const numericStreak = typeof rawStreak === 'number' ? rawStreak : (rawStreak?.current || 0)
  setStreak(numericStreak)
        setTasks((tasksData.tasks || []).map(t => ({ id: t.id, label: t.label, done: !!t.done })))
      } catch (e) {
        if (cancelled) return
        setHabitsError(e?.message || 'Failed to load habits')
      } finally {
        if (!cancelled) setHabitsLoading(false)
      }
    }
    loadHabits()
    return () => { cancelled = true }
  }, [])

  // load applications (for future modal usage)
  useEffect(() => {
    let cancelled = false
    async function loadApps() {
      setAppsLoading(true)
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await axios.get('/api/applications/my', { headers: { Authorization: `Bearer ${token}` } })
        if (cancelled) return
        setApplications(res.data.applications || [])
      } catch {} finally {
        if (!cancelled) setAppsLoading(false)
      }
    }
    loadApps()
    return () => { cancelled = true }
  }, [])

  async function toggleTask(id) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done, _optimistic: true } : t))
    try {
      await post(`/habits/tasks/${id}/toggle`)
      // refetch tasks quickly (optional) - keep optimistic for now
    } catch {
      // revert on failure
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
    }
  }

  const completionRatio = useMemo(() => {
    if (!tasks.length) return 0
    const done = tasks.filter(t => t.done).length
    return done / tasks.length
  }, [tasks])

  const stats = useMemo(() => ([
    { id: 'applications', label: 'Applications Sent', value: progress.applications, accent: 'primary' },
    { id: 'interviews', label: 'Interviews', value: progress.interviews, accent: 'accent' },
    { id: 'offers', label: 'Offers', value: progress.offers, accent: 'secondary' },
    { id: 'rejections', label: 'Rejections', value: progress.rejected, accent: 'secondary' },
    { id: 'streak', label: 'Streak (days)', value: streak, accent: 'accent' },
  ]), [progress, streak])

  const profileSkillNames = useMemo(() => {
    if (!profile || !Array.isArray(profile.skills)) return []
    return profile.skills
      .map((skill) => {
        if (!skill) return null
        if (typeof skill === 'string') return skill
        if (typeof skill === 'object') return skill.name || skill.label || skill.title || null
        return null
      })
      .filter(Boolean)
  }, [profile])

  const profileSkillSet = useMemo(() => {
    return new Set(profileSkillNames.map((name) => name.toLowerCase()))
  }, [profileSkillNames])

  const skillFocus = useMemo(() => {
    const counts = new Map()

    const bumpList = (list) => {
      list.forEach((item) => {
        const normalized = item.replace(/\s+/g, ' ').trim()
        if (!normalized) return
        counts.set(normalized, (counts.get(normalized) || 0) + 1)
      })
    }

    recommended.forEach((op) => bumpList(getOpportunitySkillList(op)))
    applications.forEach((app) => bumpList(getOpportunitySkillList(app?.opportunity)))

    if (!counts.size) {
      profileSkillNames.forEach((name) => bumpList([name]))
    }

    const total = Array.from(counts.values()).reduce((sum, val) => sum + val, 0)
    if (!total) return []
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / total) * 100)
      }))
  }, [recommended, applications, profileSkillNames, getOpportunitySkillList])

  const statusRows = useMemo(() => {
    const breakdown = progress.statusBreakdown || EMPTY_BREAKDOWN
    const total = STAGE_ORDER.reduce((sum, key) => sum + (breakdown[key] || 0), 0) || 0
    return STAGE_ORDER.map((key) => {
      const value = breakdown[key] || 0
      const label = key === 'applied' ? 'Applied' : key.charAt(0).toUpperCase() + key.slice(1)
      return {
        key,
        label,
        count: value,
        percent: total ? Math.round((value / total) * 100) : 0
      }
    })
  }, [progress.statusBreakdown])

  const filteredOpportunities = useMemo(() => {
    const appliedIds = new Set(applications.map((app) => String(app.opportunity?._id || app.opportunity)))
    const makeKey = (op) => String(op._id || op.id)

    let filtered = recommended.filter((op) => {
      const key = makeKey(op)
      if (opportunityFilter === 'applied') return appliedIds.has(key)
      if (opportunityFilter === 'saved') return savedOpportunityIds.has(key)
      if (opportunityFilter === 'matched') {
        if (!profileSkillSet.size) return true
        const skills = getOpportunitySkillList(op)
        return skills.some((skill) => profileSkillSet.has(skill.toLowerCase()))
      }
      return true
    })

    if (opportunitySort === 'fit' && profileSkillSet.size) {
      filtered = filtered
        .map((op) => {
          const skills = getOpportunitySkillList(op)
          const overlap = skills.reduce((count, skill) => count + (profileSkillSet.has(skill.toLowerCase()) ? 1 : 0), 0)
          return { op, overlap }
        })
        .sort((a, b) => b.overlap - a.overlap)
        .map(({ op }) => op)
    } else if (opportunitySort === 'popular') {
      filtered = filtered.slice().sort((a, b) => (b.applicationsCount || 0) - (a.applicationsCount || 0))
    } else {
      filtered = filtered.slice().sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bDate - aDate
      })
    }

    return filtered
  }, [applications, recommended, opportunityFilter, opportunitySort, savedOpportunityIds, profileSkillSet, getOpportunitySkillList])

  const toggleSaveOpportunity = useCallback((id) => {
    setSavedOpportunityIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const statusMaxValue = useMemo(() => {
    return statusRows.reduce((max, row) => Math.max(max, row.count), 0) || 1
  }, [statusRows])

  const [activeOpportunity, setActiveOpportunity] = useState(null)
  const activeApplication = useMemo(() => {
    if (!activeOpportunity) return null
    return applications.find(a => String(a.opportunity?._id || a.opportunity) === String(activeOpportunity._id || activeOpportunity.id)) || null
  }, [activeOpportunity, applications])

  const [applying, setApplying] = useState(false)
  const applyToActive = useCallback(async () => {
    if (!activeOpportunity || applying) return
    setApplying(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')
      await axios.post('/api/applications', { opportunityId: activeOpportunity._id || activeOpportunity.id }, { headers: { Authorization: `Bearer ${token}` } })
      // refresh apps + progress
      try {
        const res = await axios.get('/api/applications/my', { headers: { Authorization: `Bearer ${token}` } })
        setApplications(res.data.applications || [])
      } catch {}
    } catch (e) {
      // optionally surface toast (not imported here to keep minimal)
      console.error(e)
    } finally {
      setApplying(false)
    }
  }, [activeOpportunity, applying])

  const statModalItems = useMemo(() => {
    if (!statModal || !applications.length) return []
    const sorted = applications
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

    if (statModal === 'applications') return sorted

    const statuses = STAT_STATUS_FILTERS[statModal]
    if (!statuses) return []
    const normalized = statuses.map((status) => status.toLowerCase())
    return sorted.filter((app) => normalized.includes((app.status || '').toLowerCase()))
  }, [applications, statModal])

  const statModalTitle = statModal ? (STAT_TITLES[statModal] || 'Details') : ''

  const formatDate = useCallback((value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString()
  }, [])

  const openApplicationDetail = useCallback((application) => {
    if (!application) return
    let opportunityData = application.opportunity
    const targetId = application.opportunity?._id || application.opportunity || application.opportunityId
    if (!opportunityData && targetId) {
      opportunityData = recommended.find((op) => String(op._id || op.id) === String(targetId)) || null
    }
    if (opportunityData) {
      setActiveOpportunity(opportunityData)
    }
    setStatModal(null)
  }, [recommended])

  const activeOpportunityModal = useMemo(() => {
    if (!activeOpportunity) return null
    const companyProfile = activeOpportunity.companyProfile
    const companyName = companyProfile?.companyName || activeOpportunity.company || activeOpportunity.owner?.company || 'Unknown Company'
    const companyId = companyProfile?.userId || activeOpportunity.owner?._id || activeOpportunity.ownerId || activeOpportunity.owner

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setActiveOpportunity(null)} />
        <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg border bg-card shadow-lg">
          <div className="flex items-start justify-between gap-4 border-b p-4">
            <div>
              <h3 className="text-lg font-semibold">{activeOpportunity.title}</h3>
              <div className="text-sm text-muted-foreground">
                {companyId ? (
                  <Link
                    to={`/company/${companyId}`}
                    onClick={() => setActiveOpportunity(null)}
                    className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30 rounded"
                  >
                    {companyName}
                  </Link>
                ) : (
                  companyName
                )}
              </div>
            </div>
            <button onClick={() => setActiveOpportunity(null)} className="rounded px-2 py-1 text-xs hover:bg-muted">Close</button>
          </div>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{activeOpportunity.description || 'No description.'}</div>
            {activeApplication ? (
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Your Application Status</div>
                <ApplicationStatusStepper status={activeApplication.status} />
                {(activeApplication.history || []).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">History</div>
                    <ul className="space-y-1 text-[11px]">
                      {activeApplication.history.slice().reverse().map((h, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-primary/70" />
                          <span className="font-medium capitalize">{h.status}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(h.at || h.createdAt || activeApplication.createdAt).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">You have not applied yet.</div>
                <button onClick={applyToActive} disabled={applying} className="inline-flex items-center gap-2 rounded bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-50">
                  {applying && <span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" />}
                  {applying ? 'Applying...' : 'Apply Now'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }, [activeApplication, activeOpportunity, applyToActive, applying])

  const statModalContent = useMemo(() => {
    if (!statModal) return null
    return (
      <Modal open={!!statModal} onClose={() => setStatModal(null)} className="max-w-4xl">
        <ModalHeader>
          <div>
            <ModalTitle>{statModalTitle}</ModalTitle>
            <ModalDescription>Dive deeper into your recent activity.</ModalDescription>
          </div>
        </ModalHeader>
        <ModalBody className="pb-6">
          {statModalItems.length === 0 ? (
            <div className="rounded border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">No records yet.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border">
              <div className="grid grid-cols-12 gap-2 bg-muted/40 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <div className="col-span-4">Opportunity</div>
                <div className="col-span-3">Status</div>
                <div className="col-span-3 text-center">Applied</div>
                <div className="col-span-2 text-right">Company</div>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y">
                {statModalItems.map((app, index) => {
                  const opportunity = app.opportunity || recommended.find((op) => String(op._id || op.id) === String(app.opportunity?._id || app.opportunity || app.opportunityId))
                  const companyProfile = opportunity?.companyProfile
                  const companyName = companyProfile?.companyName || opportunity?.company || opportunity?.owner?.company || '—'
                  return (
                    <button
                      type="button"
                      key={String(app._id || app.id || index)}
                      onClick={() => openApplicationDetail(app)}
                      className="grid w-full grid-cols-12 gap-2 px-3 py-2 text-left text-xs transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      <div className="col-span-4 truncate">
                        <div className="font-medium text-foreground">{opportunity?.title || 'Opportunity'}</div>
                        <div className="text-[11px] text-muted-foreground">{opportunity?.location || '—'}</div>
                      </div>
                      <div className="col-span-3 flex items-center justify-start text-muted-foreground">
                        <Badge variant={app.status === 'rejected' ? 'outline' : 'secondary'} className="text-[10px] capitalize">{app.status || 'applied'}</Badge>
                      </div>
                      <div className="col-span-3 text-center text-muted-foreground">{formatDate(app.createdAt || app.appliedAt)}</div>
                      <div className="col-span-2 text-right text-muted-foreground">{companyName}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </ModalBody>
      </Modal>
    )
  }, [formatDate, openApplicationDetail, recommended, statModal, statModalItems, statModalTitle])

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, {profile?.fullName || 'Student'}</h1>
          <p className="text-sm text-muted-foreground">Here's what's happening with your job search</p>
        </div>
      </header>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_,i) => (
              <div key={i} className="p-4 rounded border bg-card space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-2 w-20" />
              </div>
            ))
          ) : (
            stats.map((s) => (
              <DashboardKPI
                key={s.id}
                label={s.label}
                value={s.value}
                accent={s.accent}
                onClick={ACTIONABLE_STATS.has(s.id) ? () => setStatModal(s.id) : undefined}
              />
            ))
          )}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Daily Tasks</h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">🔥 {streak}d</span>
              {tasks.length > 0 && (
                <span className="text-muted-foreground">{Math.round(completionRatio*100)}% done</span>
              )}
            </div>
          </div>
          {tasks.length > 0 && (
            <div className="w-full h-2 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${completionRatio*100}%` }} />
            </div>
          )}
          <div className="space-y-2">
            {habitsLoading && (
              <div className="space-y-2 bg-card/50 rounded-md p-2 border">
                {Array.from({ length: 4 }).map((_,i) => <Skeleton key={i} className="h-7 w-full" />)}
              </div>
            )}
            {habitsError && <div className="text-sm text-destructive">{habitsError}</div>}
            {!habitsLoading && !habitsError && tasks.length === 0 && <div className="text-sm text-muted-foreground bg-card/50 border rounded p-3">No tasks today.</div>}
            {!habitsLoading && !habitsError && tasks.map(t => (
              <button
                key={t.id}
                onClick={() => toggleTask(t.id)}
                className={`w-full flex items-center justify-between rounded border px-3 py-2 text-left text-[13px] font-medium transition hover:bg-accent/40 ${t.done ? 'bg-accent/60 line-through opacity-70' : 'bg-card'}`}
              >
                <span>{t.label}</span>
                <span className={`inline-block w-4 h-4 rounded-full border ${t.done ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`} />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Application Progress</h2>
          <ApplicationProgressStepper applications={progress.applications} interviews={progress.interviews} offers={progress.offers} />
          <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Stage breakdown</span>
              <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1">
                {['count', 'percent'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setStatusMetricMode(mode)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                      statusMetricMode === mode
                        ? 'bg-primary text-primary-foreground shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {mode === 'count' ? 'Counts' : 'Percent'}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {statusRows.map((row) => {
                const value = statusMetricMode === 'count' ? row.count : `${row.percent}%`
                const ratio = statusMetricMode === 'count'
                  ? (statusMaxValue ? row.count / statusMaxValue : 0)
                  : (row.percent / 100)
                return (
                  <div key={row.key} className="rounded-xl border border-border/40 bg-background/80 p-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="uppercase tracking-[0.15em]">{row.label}</span>
                      <span className="font-semibold text-foreground">{value}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(4, Math.round(ratio * 100))}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            {progress.lastActivityAt && (
              <div className="mt-3 text-[11px] text-muted-foreground">
                Last activity {new Date(progress.lastActivityAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 gap-4">
          <div>
            <h2 className="text-lg font-medium">Recommended Opportunities</h2>
            <div className="text-sm text-muted-foreground">Based on your profile</div>
          </div>
          <button
            onClick={() => loadRecommendations(true)}
            disabled={refreshing}
            className="text-xs px-3 py-1 rounded border bg-background hover:bg-muted transition disabled:opacity-50"
          >{refreshing ? 'Refreshing…' : 'Refresh'}</button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          {[
            { key: 'all', label: 'All' },
            { key: 'matched', label: 'Matches your skills' },
            { key: 'applied', label: 'Already applied' },
            { key: 'saved', label: 'Saved' }
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setOpportunityFilter(key)}
              className={cn(
                'rounded-full border px-3 py-1 transition',
                opportunityFilter === key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
          <div className="ms-auto inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 p-1">
            {[
              { key: 'recent', label: 'Recent' },
              { key: 'popular', label: 'Most applicants' },
              { key: 'fit', label: 'Best fit' }
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setOpportunitySort(key)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                  opportunitySort === key
                    ? 'bg-foreground text-background shadow'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_,i) => (
              <div key={i} className="animate-pulse rounded border p-4 space-y-3">
                <div className="h-24 rounded bg-muted" />
                <div className="h-4 w-2/3 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
                <div className="h-3 w-full bg-muted/60 rounded" />
              </div>
            ))}
          </div>
        )}
        {error && <div className="text-destructive">{error}</div>}

        {!loading && !error && (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOpportunities.length === 0 && <div className="rounded border border-dashed px-4 py-3 text-sm text-muted-foreground">No opportunities match this filter yet.</div>}
            {filteredOpportunities.map(op => {
              const applied = applications.some(a => String(a.opportunity?._id || a.opportunity) === String(op._id || op.id))
              const appObj = applied ? applications.find(a => String(a.opportunity?._id || a.opportunity) === String(op._id || op.id)) : null
              const key = String(op._id || op.id)
              const isSaved = savedOpportunityIds.has(key)
              const companyProfile = op.companyProfile
              const companyName = companyProfile?.companyName || op.company || op.owner?.company || 'Unknown Company'
              const companyId = companyProfile?.userId || op.owner?._id || op.ownerId || op.owner
              return (
              <Card key={key} className="overflow-hidden cursor-pointer group" accent="primary" onClick={() => setActiveOpportunity(op)}>
                <div className="h-40 w-full flex items-center justify-center bg-gradient-to-br from-[color:var(--card-accent)]/80 to-black/10 text-primary-foreground">
                  <span className="text-2xl font-bold">{(op.title || '').slice(0,1)}</span>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-md font-semibold">{op.title}</h3>
                      {companyId ? (
                        <Link
                          to={`/company/${companyId}`}
                          onClick={(e) => { e.stopPropagation() }}
                          className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30 rounded"
                        >
                          {companyName}
                        </Link>
                      ) : (
                        <div className="text-sm text-muted-foreground">{companyName}</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSaveOpportunity(key)
                        }}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition',
                          isSaved ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                        aria-pressed={isSaved}
                      >
                        {isSaved ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
                        {isSaved ? 'Saved' : 'Save'}
                      </button>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="muted" className="capitalize">{op.type || 'job'}</Badge>
                        {applied && <Badge variant="outline" className="text-[10px]">Applied</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                    <MapPin className="w-4 h-4" />
                    <span>{op.location || 'Remote'}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">{(op.description || '').slice(0,140)}{(op.description||'').length>140?'...':''}</p>
                  <div className="mt-3 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                    {getOpportunitySkillList(op).slice(0,4).map((skill) => (
                      <span key={skill} className="rounded-full border border-border/50 px-2 py-0.5">{skill}</span>
                    ))}
                  </div>
                  {applied && (
                    <div className="mt-4">
                      <OpportunityMiniTracker status={appObj?.status || 'applied'} />
                    </div>
                  )}
                </CardContent>
              </Card>)})}
          </div>
        )}
      </section>

      {/* Recent Applications & Skill Focus */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Recent Applications</h2>
          <div className="space-y-2">
            {appsLoading && (
              <div className="space-y-2">{Array.from({ length:3 }).map((_,i)=><div key={i} className="h-10 rounded border bg-card flex items-center px-3"><span className="w-2 h-2 rounded-full bg-primary/40 mr-2" /><span className="text-xs text-muted-foreground">Loading...</span></div>)}</div>
            )}
            {!appsLoading && applications.slice(0,5).map(a => (
              <div key={a._id} className="rounded border bg-card p-2 flex items-center justify-between text-xs">
                <div className="truncate max-w-[160px]">
                  <span className="font-medium">{a.opportunity?.title || 'Opportunity'}</span>
                  <span className="text-muted-foreground ml-1">{a.opportunity?.type}</span>
                </div>
                <div className={`px-2 py-0.5 rounded-full capitalize text-[10px] ${a.status==='rejected'?'bg-destructive/10 text-destructive':'bg-primary/10 text-primary'}`}>{a.status}</div>
              </div>
            ))}
            {!appsLoading && applications.length === 0 && <div className="text-xs text-muted-foreground">No applications yet.</div>}
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Skill Focus</h2>
          <div className="text-xs text-muted-foreground">Signals from live listings and your applications.</div>
          <div className="space-y-2">
            {!loading && skillFocus.length === 0 && (
              <div className="rounded border bg-card px-3 py-3 text-sm text-muted-foreground">
                No skill signals yet. Explore or apply to more roles to unlock personalized tracking.
              </div>
            )}
            {skillFocus.map((skill) => (
              <div key={skill.name} className="space-y-1 rounded-2xl border border-border/60 bg-card px-3 py-2">
                <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide">
                  <span>{skill.name}</span>
                  <span className="text-muted-foreground">{skill.percent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full bg-primary/70"
                    style={{ width: `${Math.max(skill.percent, 6)}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {activeOpportunityModal}
      {statModalContent}
    </div>
  )
}
