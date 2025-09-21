import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { useToast } from '../components/ui/toast'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../components/ui/card'
import MetricCard from '../components/MetricCard'
import StatGrid from '../components/StatGrid'
import UploadCard from '../components/UploadCard'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import ApplicationsListSkeleton from '../components/ApplicationsListSkeleton'
import ProfileVisibilitySettings from '@/components/ProfileVisibilitySettings'
import { Modal } from '../components/ui/modal'
import { Input } from '../components/ui/input'

export default function ProfileViewPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [resumeFile, setResumeFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [mediaMeta, setMediaMeta] = useState({ resume: null, video: null })
  const [uploading, setUploading] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [savingSkill, setSavingSkill] = useState(false)
  const [studentProgress, setStudentProgress] = useState(null)
  const [progressLoading, setProgressLoading] = useState(false)
  const [employerOverview, setEmployerOverview] = useState(null)
  const [employerLoading, setEmployerLoading] = useState(false)
  const [applications, setApplications] = useState([])
  const [appsLoading, setAppsLoading] = useState(false)
  const toast = useToast()

  function timeAgo(ts) {
    if (!ts) return ''
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return mins + 'm ago'
    const hours = Math.floor(mins / 60)
    if (hours < 24) return hours + 'h ago'
    const days = Math.floor(hours / 24)
    return days + 'd ago'
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setProfile(null)
          return
        }
        const res = await axios.get('/api/profile/me', { headers: { Authorization: `Bearer ${token}` } })
        if (cancelled) return
        const profileObj = res.data.profile || {}
        if (res?.data?.type) profileObj.role = res.data.type
        setProfile(profileObj)
      } catch (err) {
        if (cancelled) return
        const msg = err.response?.data?.message || err.message
        toast.push({ title: 'Load failed', description: msg, variant: 'destructive' })
        setError(msg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // SSE subscription for profile updates (listens to profile events for this user)
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return
    const url = `/api/events/stream?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    es.addEventListener('profile', (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload && payload._id && profile && String(payload._id) === String(profile._id)) {
          setProfile(payload)
        }
      } catch (err) {}
    })
    es.addEventListener('error', () => { try { es.close() } catch(_){} })
    return () => { try { es.close() } catch(_){} }
  }, [profile && profile._id])

  // Student progress metrics (applications/interviews/offers)
  useEffect(() => {
    if (!profile?.role || profile.role !== 'student') return
    let cancelled = false
    async function loadProgress() {
      setProgressLoading(true)
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await axios.get('/api/analytics/student/progress', { headers: { Authorization: `Bearer ${token}` } })
        if (cancelled) return
        setStudentProgress(res.data)
      } catch (e) {
        // silent fail – keep profile fallback values
      } finally {
        if (!cancelled) setProgressLoading(false)
      }
    }
    loadProgress()
    return () => { cancelled = true }
  }, [profile?.role])

  // Employer overview metrics (views/applicants/funnel)
  useEffect(() => {
    if (!profile?.role || profile.role !== 'employer') return
    let cancelled = false
    async function loadOverview() {
      setEmployerLoading(true)
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await axios.get('/api/analytics/employer/overview', { headers: { Authorization: `Bearer ${token}` } })
        if (cancelled) return
        setEmployerOverview(res.data)
      } catch (e) {
        // silent fail
      } finally {
        if (!cancelled) setEmployerLoading(false)
      }
    }
    loadOverview()
    return () => { cancelled = true }
  }, [profile?.role])

  // Student applications list with status
  useEffect(() => {
    if (profile?.role !== 'student') return
    let cancelled = false
    async function loadApps() {
      setAppsLoading(true)
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await axios.get('/api/applications/my', { headers: { Authorization: `Bearer ${token}` } })
        if (cancelled) return
        setApplications(res.data.applications || [])
      } catch (e) {
        // silent
      } finally {
        if (!cancelled) setAppsLoading(false)
      }
    }
    loadApps()
    return () => { cancelled = true }
  }, [profile?.role])

  // fetch current resume/video metadata
  useEffect(() => {
    let cancelled = false
    async function loadMedia() {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await axios.get('/api/profile/media', { headers: { Authorization: `Bearer ${token}` } })
        if (cancelled) return
        setMediaMeta({ resume: res.data.resume || null, video: res.data.video || null })
      } catch {}
    }
    loadMedia()
    return () => { cancelled = true }
  }, [])

  async function handleUpload(kind, file) {
    setUploading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')
      const meta = { name: file.name, size: file.size, type: file.type, lastModified: file.lastModified }
      if (kind === 'resume') {
        await axios.post('/api/profile/resume', meta, { headers: { Authorization: `Bearer ${token}` } })
      } else if (kind === 'video') {
        await axios.post('/api/profile/video', meta, { headers: { Authorization: `Bearer ${token}` } })
      }
      const refreshed = await axios.get('/api/profile/media', { headers: { Authorization: `Bearer ${token}` } })
      setMediaMeta({ resume: refreshed.data.resume || null, video: refreshed.data.video || null })
      toast.push({ title: 'Saved', description: `${kind === 'resume' ? 'Resume' : 'Video'} metadata stored.` })
    } catch (e) {
      const msg = e.response?.data?.message || e.message
      toast.push({ title: 'Upload failed', description: msg, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  async function saveSkills(nextSkills) {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      await axios.patch('/api/profile', { skills: nextSkills }, { headers: { Authorization: `Bearer ${token}` } })
    } catch (e) {
      const msg = e.response?.data?.message || e.message
      toast.push({ title: 'Skill sync failed', description: msg, variant: 'destructive' })
      throw e
    }
  }

  async function handleAddSkill(e) {
    e.preventDefault()
    const trimmed = newSkill.trim()
    if (!trimmed) return
    if ((profile.skills || []).includes(trimmed)) {
      setNewSkill('')
      return
    }
    const prev = profile.skills || []
    const optimistic = [...prev, trimmed]
    setProfile(p => ({ ...p, skills: optimistic }))
    setSavingSkill(true)
    try {
      await saveSkills(optimistic)
      toast.push({ title: 'Skill added', description: trimmed })
      setNewSkill('')
    } catch {
      // revert
      setProfile(p => ({ ...p, skills: prev }))
    } finally {
      setSavingSkill(false)
    }
  }

  async function handleRemoveSkill(skill) {
    const prev = profile.skills || []
    const optimistic = prev.filter(s => s !== skill)
    setProfile(p => ({ ...p, skills: optimistic }))
    setSavingSkill(true)
    try {
      await saveSkills(optimistic)
      toast.push({ title: 'Skill removed', description: skill })
    } catch {
      setProfile(p => ({ ...p, skills: prev }))
    } finally {
      setSavingSkill(false)
    }
  }

  const role = profile?.role
  const [editing, setEditing] = useState(false)
  const [formState, setFormState] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    if (profile) setFormState({
      fullName: profile.fullName || '',
      bio: profile.bio || '',
      college: profile.college || '',
      major: profile.major || '',
      graduationYear: profile.graduationYear || '',
      companyName: profile.companyName || '',
      companyWebsite: profile.companyWebsite || '',
      skills: Array.isArray(profile.skills) ? profile.skills.slice() : [],
      visibility: profile.visibility || {}
    })
  }, [profile])

  async function saveProfile(e) {
    e && e.preventDefault()
    if (!formState) return
    setSavingProfile(true)
    const prev = profile
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')
      // optimistic update locally
      setProfile(p => ({ ...p, ...formState }))
      const res = await axios.patch('/api/profile', formState, { headers: { Authorization: `Bearer ${token}` } })
      const updated = res.data.profile || res.data || formState
      setProfile(updated)
      // notify other UIs (client-side) — server will also broadcast via Kafka/Redis
      try { window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { profile: updated } })) } catch(_){}
      toast.push({ title: 'Saved', description: 'Profile updated.' })
      setEditing(false)
    } catch (err) {
      setProfile(prev)
      const msg = err.response?.data?.message || err.message
      toast.push({ title: 'Save failed', description: msg, variant: 'destructive' })
    } finally {
      setSavingProfile(false)
    }
  }

  const studentStats = useMemo(() => ([
    { label: 'Applications', value: studentProgress?.applications ?? profile?.applicationsCount ?? '—', hint: 'Total submitted' },
    { label: 'Interviews', value: studentProgress?.interviews ?? profile?.interviewsCount ?? '—', hint: 'Scheduled / completed' },
    { label: 'Offers', value: studentProgress?.offers ?? profile?.offersCount ?? '—', hint: 'Secured so far' },
    { label: 'Skills', value: (profile?.skills?.length) ?? 0, hint: 'Tracked skills' }
  ]), [profile, studentProgress])

  const employerStats = useMemo(() => ([
    { label: 'Active Listings', value: employerOverview?.activeListings ?? profile?.activeListings ?? '—', hint: 'Open positions' },
    { label: 'Applicants', value: employerOverview?.totalApplicants ?? profile?.totalApplicants ?? '—', hint: 'Across all listings' },
    { label: 'Views (30d)', value: employerOverview?.viewsLast30d ?? '—', hint: 'Listing impressions' },
    { label: 'Conv. Rate', value: employerOverview?.applicationConversionRate != null ? `${(employerOverview.applicationConversionRate * 100).toFixed(0)}%` : '—', hint: 'Views → Applicants' }
  ]), [profile, employerOverview])

  if (loading) return <div className="p-6">Loading profile...</div>
  if (error) return <div className="p-6 text-destructive">Failed to load profile.</div>
  if (!profile) return <div className="p-6">No profile found.</div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <div className="text-sm text-muted-foreground flex items-center gap-2">Role: <Badge variant="outline" className="capitalize">{role}</Badge></div>
      </header>

      {/* Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Overview</CardTitle>
          <CardDescription>Your public and account details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Full Name</div>
              <div className="text-sm font-medium">{profile.fullName || '—'}</div>
            </div>
            {role === 'student' && (
              <>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">College</div>
                  <div className="text-sm font-medium">{profile.college || '—'}</div>
                </div>
                <div className="flex gap-6">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Major</div>
                    <div className="text-sm font-medium">{profile.major || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Grad Year</div>
                    <div className="text-sm font-medium">{profile.graduationYear || '—'}</div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Skills</div>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('skill-input')
                        if (el) el.focus()
                      }}
                      className="text-[10px] text-primary hover:underline"
                    >Add</button>
                  </div>
                  <div className="text-xs flex flex-wrap gap-2 mb-2">
                    {(profile.skills||[]).length ? profile.skills.map(s => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => handleRemoveSkill(s)}
                        className="group rounded bg-muted px-2 py-0.5 text-[10px] font-medium flex items-center gap-1 hover:bg-destructive/10 hover:text-destructive transition"
                        title="Click to remove"
                      >
                        <span>{s}</span>
                        <span className="opacity-40 group-hover:opacity-100">×</span>
                      </button>
                    )) : <span className="text-muted-foreground">None</span>}
                  </div>
                  <form onSubmit={handleAddSkill} className="flex items-center gap-2">
                    <input
                      id="skill-input"
                      value={newSkill}
                      onChange={e => setNewSkill(e.target.value)}
                      placeholder="Add skill"
                      className="flex-1 rounded border bg-background px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={savingSkill}
                    />
                    <button
                      type="submit"
                      disabled={!newSkill.trim() || savingSkill}
                      className="text-[11px] px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-40"
                    >{savingSkill ? '...' : 'Add'}</button>
                  </form>
                  <div className="mt-1 text-[10px] text-muted-foreground">Click a skill to remove. (Syncs to profile)</div>
                </div>
              </>
            )}
            {role === 'employer' && (
              <>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Company Name</div>
                  <div className="text-sm font-medium">{profile.companyName || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Company Website</div>
                  <div className="text-sm font-medium break-all">{profile.companyWebsite || '—'}</div>
                </div>
              </>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bio</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap min-h-[60px]">{profile.bio || 'No bio yet.'}</p>
            </div>
            <div>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}> Edit Profile </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Modal */}
      {editing && formState && (
        <Modal onClose={() => setEditing(false)}>
          <form onSubmit={saveProfile} className="max-w-2xl p-4">
            <h3 className="text-lg font-semibold mb-2">Edit Profile</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">Full name</label>
                <Input value={formState.fullName} onChange={e => setFormState(fs => ({ ...fs, fullName: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Location</label>
                <Input value={profile.location || ''} disabled />
              </div>
              {role === 'student' && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">College</label>
                    <Input value={formState.college} onChange={e => setFormState(fs => ({ ...fs, college: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Major</label>
                    <Input value={formState.major} onChange={e => setFormState(fs => ({ ...fs, major: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Graduation Year</label>
                    <Input value={formState.graduationYear} onChange={e => setFormState(fs => ({ ...fs, graduationYear: e.target.value }))} />
                  </div>
                </>
              )}
              {role === 'employer' && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">Company</label>
                    <Input value={formState.companyName} onChange={e => setFormState(fs => ({ ...fs, companyName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Website</label>
                    <Input value={formState.companyWebsite} onChange={e => setFormState(fs => ({ ...fs, companyWebsite: e.target.value }))} />
                  </div>
                </>
              )}
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Bio</label>
                <textarea value={formState.bio} onChange={e => setFormState(fs => ({ ...fs, bio: e.target.value }))} className="w-full rounded border p-2" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Skills (comma separated)</label>
                <Input value={(formState.skills || []).join(', ')} onChange={e => setFormState(fs => ({ ...fs, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save'}</Button>
                  <Button type="button" variant="outline" onClick={() => { setFormState({ ...profile }); setEditing(false) }}>Cancel</Button>
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}

      <div className="space-y-6">
        <h2 className="text-lg font-medium tracking-tight">Privacy & Visibility</h2>
        <ProfileVisibilitySettings />
      </div>

      {/* Role Metrics */}
      {role === 'student' && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium tracking-tight">Progress</h2>
          <StatGrid>
            {studentStats.map(s => <MetricCard key={s.label} label={s.label} value={s.value} hint={s.hint} />)}
          </StatGrid>
          <div className="space-y-3">
            <h3 className="text-md font-medium">Your Applications</h3>
            {appsLoading && <ApplicationsListSkeleton rows={4} />}
            {!appsLoading && applications.length === 0 && <div className="text-sm text-muted-foreground">No applications yet.</div>}
            <div className="space-y-2">
              {applications.map(app => {
                const status = app.status || 'applied'
                const stages = ['applied','screening','interview','offer']
                const currentIndex = stages.indexOf(status === 'rejected' ? 'applied' : status)
                return (
                  <div key={app._id} className="rounded border bg-card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium truncate max-w-[200px]">{app.opportunity?.title || 'Opportunity'}</div>
                      <div className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${status==='rejected'?'bg-destructive/10 text-destructive':'bg-primary/10 text-primary'}`}>{status}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {stages.map((st, i) => (
                        <div key={st} className="flex-1 flex items-center">
                          <div className={`h-2 w-full rounded ${i <= currentIndex ? 'bg-primary' : 'bg-muted'}`}></div>
                          {i < stages.length -1 && <div className="w-2" />}
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                      <span>Applied</span>
                      <span>Screen</span>
                      <span>Interview</span>
                      <span>Offer</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
      {role === 'employer' && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium tracking-tight">Company Metrics</h2>
          <StatGrid>
            {employerStats.map(s => <MetricCard key={s.label} label={s.label} value={s.value} hint={s.hint} />)}
          </StatGrid>
        </div>
      )}

      {/* Upload Section (Student) */}
      {role === 'student' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <UploadCard
              title="Resume"
              description="Upload a PDF resume to enhance employer visibility"
              accept="application/pdf"
              value={resumeFile}
              onSelect={file => { setResumeFile(file); handleUpload('resume', file) }}
              helper={mediaMeta.resume ? `Last: ${mediaMeta.resume.name} (${Math.round((mediaMeta.resume.size||0)/1024)} KB)` : 'Resume parsing & keyword scoring coming soon.'}
              comingSoon
            />
            {uploading && resumeFile && <div className="text-xs text-muted-foreground">Saving resume metadata...</div>}
            {!uploading && mediaMeta.resume?.uploadedAt && (
              <div className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Saved {timeAgo(mediaMeta.resume.uploadedAt)}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <UploadCard
              title="Intro Video (1 min)"
              description="Record or upload a short intro video"
              accept="video/mp4,video/webm"
              value={videoFile}
              onSelect={file => { setVideoFile(file); handleUpload('video', file) }}
              helper={mediaMeta.video ? `Last: ${mediaMeta.video.name} (${Math.round((mediaMeta.video.size||0)/1024)} KB)` : 'We will transcribe & analyze soft skills soon.'}
              comingSoon
            />
            {uploading && videoFile && <div className="text-xs text-muted-foreground">Saving video metadata...</div>}
            {!uploading && mediaMeta.video?.uploadedAt && (
              <div className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Saved {timeAgo(mediaMeta.video.uploadedAt)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employer Analytics Placeholders */}
      {role === 'employer' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Listing Performance (Preview)</CardTitle>
            <CardDescription>Funnel & engagement snapshot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {employerLoading && <div className="text-xs text-muted-foreground">Loading analytics...</div>}
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div className="rounded border bg-card p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Views (30d)</div>
                <div className="text-base font-semibold">{employerOverview?.viewsLast30d ?? '—'}</div>
                <div className="text-[10px] text-muted-foreground mt-1">Recent listing impressions</div>
              </div>
              <div className="rounded border bg-card p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Applicants</div>
                <div className="text-base font-semibold">{employerOverview?.totalApplicants ?? profile?.totalApplicants ?? '—'}</div>
                <div className="text-[10px] text-muted-foreground mt-1">Across active listings</div>
              </div>
              <div className="rounded border bg-card p-3 col-span-full">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Conversion Funnel</div>
                {employerOverview?.funnel ? (
                  <div className="flex items-end gap-4">
                    {employerOverview.funnel.map(step => (
                      <div key={step.stage} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-muted rounded h-16 overflow-hidden">
                          <div
                            className="bg-primary h-full"
                            style={{ height: '100%', width: `${Math.max(4, step.rate * 100)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground text-center leading-tight">
                          <div>{step.stage}</div>
                          <div className="font-medium text-foreground">{(step.rate * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Funnel data not available yet.</div>
                )}
              </div>
              <div className="rounded border bg-card p-3 col-span-full">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Avg Applicants / Listing</div>
                <div className="text-base font-semibold">{employerOverview?.avgApplicantsPerListing ?? profile?.avgApplicantsPerListing ?? '—'}</div>
                <div className="text-[10px] text-muted-foreground mt-1">Engagement quality indicator</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• Time-to-first-applicant metric (coming soon)</div>
              <div>• Skill match heatmap (roadmap)</div>
            </div>
          </CardContent>
          <CardFooter>
            <Button size="sm" variant="outline" disabled>Open Analytics Suite (Soon)</Button>
          </CardFooter>
        </Card>
      )}

      {/* Admin Overview (if future admin viewing own profile) */}
      {role === 'admin' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Admin Overview</CardTitle>
            <CardDescription>High-level platform stats (future)</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div>• Total users</div>
            <div>• Active listings</div>
            <div>• Daily applications</div>
            <div>• Messaging volume</div>
          </CardContent>
        </Card>
      )}

      {/* Raw JSON (debug toggle later) */}
      <details className="mt-8">
        <summary className="cursor-pointer text-sm text-muted-foreground">Debug Data</summary>
        <pre className="text-xs mt-2 bg-muted p-3 rounded overflow-auto max-h-64">{JSON.stringify(profile, null, 2)}</pre>
      </details>
    </div>
  )
}

