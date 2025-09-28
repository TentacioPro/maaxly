import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Sparkles, MapPin, Link2, Trash2, Plus, UserRound } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Label } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import MetricCard from '@/components/MetricCard'
import UploadCard from '@/components/UploadCard'
import ApplicationsListSkeleton from '@/components/ApplicationsListSkeleton'
import ProfileVisibilitySettings from '@/components/ProfileVisibilitySettings'
import AvatarCropDialog from '@/components/AvatarCropDialog'

const JOB_STATUSES = [
  { value: 'NOT_LOOKING', label: 'Not looking' },
  { value: 'OPEN_TO_OPPORTUNITIES', label: 'Open to opportunities' },
  { value: 'ACTIVELY_APPLYING', label: 'Actively applying' }
]

const emptyExperience = () => ({
  title: '',
  company: '',
  startDate: '',
  endDate: '',
  description: ''
})

const emptyEducation = () => ({
  institution: '',
  degree: '',
  fieldOfStudy: '',
  startDate: '',
  endDate: ''
})

function toInputDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function timeAgo(ts) {
  if (!ts) return ''
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
}

function normalizeSkills(skills) {
  if (!Array.isArray(skills)) return []
  return skills
    .map((s) => {
      if (!s) return null
      if (typeof s === 'string') return s
      if (typeof s === 'object' && s.name) return s.name
      return null
    })
    .filter(Boolean)
}

function buildForm(profile = {}) {
  const linkDefaults = { portfolio: '', github: '', linkedin: '' }
  const prefDefaults = {
    jobSearchStatus: 'OPEN_TO_OPPORTUNITIES',
    primaryRole: '',
    openToRoles: [],
    salaryExpectation: ''
  }

  return {
    fullName: profile.fullName || '',
    headline: profile.headline || '',
    location: profile.location || '',
    bio: profile.bio || '',
    college: profile.college || '',
    major: profile.major || '',
    graduationYear: profile.graduationYear ? String(profile.graduationYear) : '',
    links: { ...linkDefaults, ...(profile.links || {}) },
    skills: normalizeSkills(profile.skills),
    experience: Array.isArray(profile.experience)
      ? profile.experience.map((item) => ({
        title: item.title || '',
        company: item.company || '',
        startDate: toInputDate(item.startDate),
        endDate: toInputDate(item.endDate),
        description: item.description || ''
      }))
      : [],
    education: Array.isArray(profile.education)
      ? profile.education.map((item) => ({
        institution: item.institution || '',
        degree: item.degree || '',
        fieldOfStudy: item.fieldOfStudy || '',
        startDate: toInputDate(item.startDate),
        endDate: toInputDate(item.endDate)
      }))
      : [],
    preferences: { ...prefDefaults, ...(profile.preferences || {}) },
    visibility: profile.visibility || 'PUBLIC',
    username: profile.username || ''
  }
}

export default function ProfileViewPage() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [viewingResume, setViewingResume] = useState(false)
  const [mediaMeta, setMediaMeta] = useState({ resume: null, video: null })
  const [resumeFile, setResumeFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [newSkill, setNewSkill] = useState('')
  const [openRoleInput, setOpenRoleInput] = useState('')
  const [applications, setApplications] = useState([])
  const [appsLoading, setAppsLoading] = useState(false)
  const [studentProgress, setStudentProgress] = useState(null)
  const [progressLoading, setProgressLoading] = useState(false)
  const [employerOverview, setEmployerOverview] = useState(null)
  const [employerLoading, setEmployerLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Missing token')
        const res = await axios.get('/api/profile/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (cancelled) return
        const fetched = res.data?.profile || {}
        const type = res.data?.type || fetched.role || 'student'
        setProfile({ ...fetched, role: type })
        setRole(type)
        setForm(buildForm(fetched))
        setDirty(false)
      } catch (err) {
        if (cancelled) return
        const msg = err.response?.data?.message || err.message
        setError(msg)
        toast.push({ title: 'Unable to load profile', description: msg, variant: 'destructive' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadProfile()
    return () => {
      cancelled = true
    }
  }, [toast])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return
    const es = new EventSource(`/api/events/stream?token=${encodeURIComponent(token)}`)
    es.addEventListener('profile', (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (!payload || !payload._id) return
        setProfile((prev) => {
          if (!prev || String(prev._id) !== String(payload._id)) return prev
          // only sync if user hasn't made local edits
          if (dirty) return prev
          setForm(buildForm(payload))
          return { ...payload, role: prev.role }
        })
      } catch (_) {}
    })
    es.addEventListener('error', () => {
      try { es.close() } catch (_) {}
    })
    return () => {
      try { es.close() } catch (_) {}
    }
  }, [dirty])

  useEffect(() => {
    let cancelled = false
    async function loadMedia() {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await axios.get('/api/profile/media', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (cancelled) return
        setMediaMeta({ resume: res.data?.resume || null, video: res.data?.video || null })
      } catch (_) {}
    }
    loadMedia()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (role !== 'student') return
    let cancelled = false
    async function loadProgress() {
      setProgressLoading(true)
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await axios.get('/api/analytics/student/progress', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (cancelled) return
        setStudentProgress(res.data?.progress || null)
      } catch (_) {
        setStudentProgress(null)
      } finally {
        if (!cancelled) setProgressLoading(false)
      }
    }
    loadProgress()
    return () => {
      cancelled = true
    }
  }, [role])

  useEffect(() => {
    if (role !== 'student') return
    let cancelled = false
    async function loadApps() {
      setAppsLoading(true)
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await axios.get('/api/applications/my', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (cancelled) return
        setApplications(res.data?.applications || [])
      } catch (_) {
        setApplications([])
      } finally {
        if (!cancelled) setAppsLoading(false)
      }
    }
    loadApps()
    return () => {
      cancelled = true
    }
  }, [role])

  useEffect(() => {
    if (role !== 'employer') return
    let cancelled = false
    async function loadOverview() {
      setEmployerLoading(true)
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await axios.get('/api/analytics/employer/overview', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (cancelled) return
        setEmployerOverview(res.data?.overview || null)
      } catch (_) {
        setEmployerOverview(null)
      } finally {
        if (!cancelled) setEmployerLoading(false)
      }
    }
    loadOverview()
    return () => {
      cancelled = true
    }
  }, [role])

  const studentStats = useMemo(() => ([
    { label: 'Applications', value: studentProgress?.applications ?? '—', hint: 'Submitted so far' },
    { label: 'Interviews', value: studentProgress?.interviews ?? '—', hint: 'Scheduled chats' },
    { label: 'Offers', value: studentProgress?.offers ?? '—', hint: 'Wins to celebrate' },
    { label: 'Skills', value: form?.skills?.length ?? 0, hint: 'Core strengths' }
  ]), [studentProgress, form])

  const employerStats = useMemo(() => ([
    { label: 'Active Listings', value: employerOverview?.totalListings ?? '—', hint: 'Live job posts' },
    { label: 'Applicants', value: employerOverview?.totalApplicants ?? '—', hint: 'All-time submissions' },
    { label: 'Avg / Listing', value: employerOverview?.avgApplicantsPerListing ? employerOverview.avgApplicantsPerListing.toFixed(1) : '—', hint: 'Engagement health' },
    { label: 'Views (30d)', value: employerOverview?.viewsLast30d ?? '—', hint: 'Top of funnel' }
  ]), [employerOverview])

  function mutateForm(mutator) {
    setForm((prev) => {
      const next = mutator(prev ? { ...prev } : buildForm())
      return next
    })
    setDirty(true)
  }

  function updateField(path, value) {
    mutateForm((draft) => {
      const keys = path.split('.')
      let cursor = draft
      for (let i = 0; i < keys.length - 1; i += 1) {
        const key = keys[i]
        cursor[key] = Array.isArray(cursor[key]) ? [...cursor[key]] : { ...cursor[key] }
        cursor = cursor[key]
      }
      cursor[keys.at(-1)] = value
      return draft
    })
  }

  async function handleSave() {
    if (!form) return
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Missing token')
      const payload = {
        fullName: form.fullName?.trim(),
        headline: form.headline?.trim(),
        location: form.location?.trim(),
        bio: form.bio,
        college: form.college?.trim(),
        major: form.major?.trim(),
        graduationYear: form.graduationYear ? Number(form.graduationYear) : undefined,
        links: form.links,
        skills: form.skills,
        preferences: {
          jobSearchStatus: form.preferences?.jobSearchStatus || 'OPEN_TO_OPPORTUNITIES',
          primaryRole: form.preferences?.primaryRole || '',
          openToRoles: Array.isArray(form.preferences?.openToRoles)
            ? form.preferences.openToRoles.filter(Boolean)
            : [],
          salaryExpectation: form.preferences?.salaryExpectation
            ? Number(form.preferences.salaryExpectation)
            : undefined
        },
        experience: Array.isArray(form.experience)
          ? form.experience
            .filter((item) => item && (item.title || item.company))
            .map((item) => ({
              title: item.title,
              company: item.company,
              startDate: item.startDate ? new Date(item.startDate).toISOString() : undefined,
              endDate: item.endDate ? new Date(item.endDate).toISOString() : undefined,
              description: item.description
            }))
          : [],
        education: Array.isArray(form.education)
          ? form.education
            .filter((item) => item && (item.institution || item.degree))
            .map((item) => ({
              institution: item.institution,
              degree: item.degree,
              fieldOfStudy: item.fieldOfStudy,
              startDate: item.startDate ? new Date(item.startDate).toISOString() : undefined,
              endDate: item.endDate ? new Date(item.endDate).toISOString() : undefined
            }))
          : [],
        visibility: form.visibility,
        username: form.username?.trim()
      }

      if (role === 'employer') {
        delete payload.college
        delete payload.major
        delete payload.graduationYear
        delete payload.preferences
        delete payload.experience
        delete payload.education
        delete payload.links
        delete payload.skills
      }

      const res = await axios.patch('/api/profile', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const updated = res.data?.profile || payload
      setProfile((prev) => ({ ...prev, ...updated }))
      setForm(buildForm(updated))
      setDirty(false)
      toast.push({ title: 'Profile saved', description: 'Your changes are live.' })
    } catch (err) {
      const msg = err.response?.data?.message || err.message
      toast.push({ title: 'Save failed', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(kind, file) {
    setUploading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Missing token')
      if (kind === 'resume') {
        const fd = new FormData()
        fd.append('file', file)
        await axios.post('/api/profile/resume', fd, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else if (kind === 'video') {
        const meta = { name: file.name, size: file.size, type: file.type, lastModified: file.lastModified }
        await axios.post('/api/profile/video', meta, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      const refreshed = await axios.get('/api/profile/media', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMediaMeta({ resume: refreshed.data?.resume || null, video: refreshed.data?.video || null })
      toast.push({ title: `${kind === 'resume' ? 'Resume' : 'Video'} uploaded` })
    } catch (err) {
      const msg = err.response?.data?.message || err.message
      toast.push({ title: 'Upload failed', description: msg, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  async function openBlobInNewTab(blob, filename) {
    const blobUrl = URL.createObjectURL(blob)
    const viewer = window.open(blobUrl, '_blank', 'noopener')
    if (!viewer) {
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = filename || 'resume.pdf'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
    }
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl)
    }, 60_000)
  }

  async function handleResumeView() {
    if (!mediaMeta.resume?.fileId) return
    const token = localStorage.getItem('token')
    if (!token) {
      toast.push({ title: 'Missing session', description: 'Sign in again to view your resume.', variant: 'destructive' })
      return
    }

    setViewingResume(true)
    try {
      const response = await axios.get('/api/profile/resume/download', {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      })
      const type = response.headers['content-type'] || 'application/pdf'
      const blob = new Blob([response.data], { type })
      await openBlobInNewTab(blob, mediaMeta.resume?.name)
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to open resume.'
      toast.push({ title: 'Resume unavailable', description: msg, variant: 'destructive' })
    } finally {
      setViewingResume(false)
    }
  }

  function ensureSkillExists(name) {
    const token = localStorage.getItem('token')
    if (!token) return
    axios.post('/api/skills', { name }, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {})
  }

  function handleAddSkill(e) {
    e.preventDefault()
    if (!newSkill.trim()) return
    const value = newSkill.trim()
    if (form.skills.includes(value)) {
      setNewSkill('')
      return
    }
    ensureSkillExists(value)
    mutateForm((draft) => {
      draft.skills = [...(draft.skills || []), value]
      return draft
    })
    setNewSkill('')
  }

  function handleRemoveSkill(skill) {
    mutateForm((draft) => {
      draft.skills = (draft.skills || []).filter((s) => s !== skill)
      return draft
    })
  }

  function handleAddExperience() {
    mutateForm((draft) => {
      draft.experience = [...(draft.experience || []), emptyExperience()]
      return draft
    })
  }

  function handleExperienceChange(index, field, value) {
    mutateForm((draft) => {
      const next = [...(draft.experience || [])]
      next[index] = { ...next[index], [field]: value }
      draft.experience = next
      return draft
    })
  }

  function handleRemoveExperience(index) {
    mutateForm((draft) => {
      draft.experience = (draft.experience || []).filter((_, i) => i !== index)
      return draft
    })
  }

  function handleAddEducation() {
    mutateForm((draft) => {
      draft.education = [...(draft.education || []), emptyEducation()]
      return draft
    })
  }

  function handleEducationChange(index, field, value) {
    mutateForm((draft) => {
      const next = [...(draft.education || [])]
      next[index] = { ...next[index], [field]: value }
      draft.education = next
      return draft
    })
  }

  function handleRemoveEducation(index) {
    mutateForm((draft) => {
      draft.education = (draft.education || []).filter((_, i) => i !== index)
      return draft
    })
  }

  function handleAddOpenRole() {
    const value = openRoleInput.trim()
    if (!value) return
    if (form.preferences.openToRoles.includes(value)) {
      setOpenRoleInput('')
      return
    }
    mutateForm((draft) => {
      draft.preferences.openToRoles = [...(draft.preferences.openToRoles || []), value]
      return draft
    })
    setOpenRoleInput('')
  }

  function handleRemoveOpenRole(roleName) {
    mutateForm((draft) => {
      draft.preferences.openToRoles = (draft.preferences.openToRoles || []).filter((r) => r !== roleName)
      return draft
    })
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading profile...</div>
  }

  if (error || !form) {
    return <div className="p-8 text-destructive">{error || 'Unable to load profile.'}</div>
  }

  const publicUrl = profile?.username ? `/u/${profile.username}` : profile?.publicId ? `/s/${profile.publicId}` : null

  return (
    <div className="relative">
      <div className="absolute inset-0 pointer-events-none opacity-30" aria-hidden="true">
        <div className="h-64 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-10 px-4 pb-24 pt-8">
        <section className="rounded-3xl border border-border/60 bg-background/90 p-6 shadow-xl shadow-indigo-500/10 backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <button
              type="button"
              onClick={() => setAvatarOpen(true)}
              className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-3xl border-4 border-background shadow-lg transition hover:-translate-y-1"
            >
              {profile?.profilePictureUrl ? (
                <img
                  src={`${profile.profilePictureUrl}?${Date.now()}`}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.src = '/vite.svg' }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <UserRound className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <span className="absolute bottom-2 right-2 rounded-full bg-background/90 px-2 py-1 text-xs font-medium shadow">Change</span>
            </button>
            <div className="flex-1 space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {form.fullName || profile?.username || 'Your profile'}
                  </h1>
                  <p className="max-w-xl text-sm text-muted-foreground">
                    {form.headline || 'Craft a headline that showcases your ambition and personality.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {publicUrl && (
                    <a
                      className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur transition hover:bg-white/20"
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Link2 className="mr-1 inline h-3 w-3" /> Public profile
                    </a>
                  )}
                  <Badge variant="secondary" className="bg-primary/15 text-primary">
                    <Sparkles className="mr-1 h-3 w-3" /> {role === 'student' ? 'Student' : role === 'employer' ? 'Employer' : 'Admin'}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{form.location || 'Add your city'}</span>
                </div>
                {form.username && <span>@{form.username}</span>}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section className="space-y-6">
              <div>
                <Label className="uppercase text-[10px] tracking-[0.2em] text-muted-foreground">Full name</Label>
                <Input value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder="Jamie Rivera" />
              </div>
              <div>
                <Label className="uppercase text-[10px] tracking-[0.2em] text-muted-foreground">Headline</Label>
                <Input value={form.headline} onChange={(e) => updateField('headline', e.target.value)} placeholder="Product design student crafting inclusive experiences" />
              </div>
              <div>
                <Label className="uppercase text-[10px] tracking-[0.2em] text-muted-foreground">Location</Label>
                <Input value={form.location} onChange={(e) => updateField('location', e.target.value)} placeholder="Austin, TX" />
              </div>
              <div>
                <Label className="uppercase text-[10px] tracking-[0.2em] text-muted-foreground">About</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => updateField('bio', e.target.value)}
                  placeholder="Tell your story in a way that makes employers remember you."
                  className="min-h-[120px]"
                />
                <div className="mt-1 text-xs text-muted-foreground">
                  Share passions, projects, and what you're looking for next.
                </div>
              </div>
            </section>

            <aside className="space-y-4 rounded-2xl border border-border/60 bg-card p-4">
              <h2 className="text-sm font-semibold">Quick info</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Username</div>
                  <Input value={form.username} onChange={(e) => updateField('username', e.target.value)} placeholder="jamie-r" />
                </div>
                {role === 'student' && (
                  <>
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">College</div>
                      <Input value={form.college} onChange={(e) => updateField('college', e.target.value)} placeholder="UT Austin" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Major</div>
                        <Input value={form.major} onChange={(e) => updateField('major', e.target.value)} placeholder="Design" />
                      </div>
                      <div>
                        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Grad year</div>
                        <Input value={form.graduationYear} onChange={(e) => updateField('graduationYear', e.target.value)} placeholder="2025" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </aside>
          </div>
        </section>

        {role === 'student' && (
          <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg">Signature skills</CardTitle>
                <CardDescription>Spotlight the strengths you want recruiters to see first.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {form.skills.length ? (
                    form.skills.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="group inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/20"
                      >
                        {skill}
                        <span className="text-muted-foreground transition group-hover:text-primary">×</span>
                      </button>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No skills yet—add a few to boost visibility.</div>
                  )}
                </div>
                <form onSubmit={handleAddSkill} className="flex items-center gap-2">
                  <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Type a skill and press enter" />
                  <Button type="submit" variant="outline" size="sm">
                    <Plus className="mr-1 h-3 w-3" /> Add
                  </Button>
                </form>
                <div className="text-xs text-muted-foreground">
                  Pro tip: pick 6-10 skills that reflect your current focus. Click a chip to remove it.
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg">Career vibes</CardTitle>
                <CardDescription>Let employers know how and where you shine.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Job search energy</div>
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                    value={form.preferences.jobSearchStatus}
                    onChange={(e) => updateField('preferences.jobSearchStatus', e.target.value)}
                  >
                    {JOB_STATUSES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Dream role</div>
                  <Input
                    value={form.preferences.primaryRole || ''}
                    onChange={(e) => updateField('preferences.primaryRole', e.target.value)}
                    placeholder="Product Designer"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Open to</div>
                  <div className="flex flex-wrap gap-2">
                    {(form.preferences.openToRoles || []).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleRemoveOpenRole(item)}
                        className="group inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs"
                      >
                        {item}
                        <Trash2 className="h-3 w-3 text-muted-foreground group-hover:text-destructive" />
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      value={openRoleInput}
                      onChange={(e) => setOpenRoleInput(e.target.value)}
                      placeholder="UI Designer, UX Researcher..."
                    />
                    <Button type="button" size="sm" variant="outline" onClick={handleAddOpenRole}>
                      Add
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Salary signal (optional)</div>
                  <Input
                    type="number"
                    value={form.preferences.salaryExpectation || ''}
                    onChange={(e) => updateField('preferences.salaryExpectation', e.target.value)}
                    placeholder="70000"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Signature links</div>
                  <div className="space-y-2 pt-1">
                    <Input
                      value={form.links.portfolio}
                      onChange={(e) => updateField('links.portfolio', e.target.value)}
                      placeholder="Portfolio URL"
                    />
                    <Input
                      value={form.links.github}
                      onChange={(e) => updateField('links.github', e.target.value)}
                      placeholder="GitHub"
                    />
                    <Input
                      value={form.links.linkedin}
                      onChange={(e) => updateField('links.linkedin', e.target.value)}
                      placeholder="LinkedIn"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {role === 'student' && (
          <section className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg">Experience</CardTitle>
                <CardDescription>Highlight internships, projects, and wins.</CardDescription>
                <Button onClick={handleAddExperience} size="sm" variant="outline" className="mt-2 self-start">
                  <Plus className="mr-1 h-3 w-3" /> Add experience
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {form.experience.length === 0 && (
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                    No experience yet—add internships, campus leadership, freelance work, or standout class projects.
                  </div>
                )}
                {form.experience.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
                    <div className="mb-3 flex justify-between text-xs text-muted-foreground">
                      <span>Entry {index + 1}</span>
                      <button type="button" onClick={() => handleRemoveExperience(index)} className="text-destructive hover:underline">
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Title</div>
                        <Input value={item.title} onChange={(e) => handleExperienceChange(index, 'title', e.target.value)} placeholder="Design Intern" />
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Company / Team</div>
                        <Input value={item.company} onChange={(e) => handleExperienceChange(index, 'company', e.target.value)} placeholder="Figma" />
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Start</div>
                        <Input type="date" value={item.startDate} onChange={(e) => handleExperienceChange(index, 'startDate', e.target.value)} />
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">End</div>
                        <Input type="date" value={item.endDate} onChange={(e) => handleExperienceChange(index, 'endDate', e.target.value)} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Impact</div>
                      <Textarea value={item.description} onChange={(e) => handleExperienceChange(index, 'description', e.target.value)} placeholder="What did you achieve? How did it move the needle?" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg">Education</CardTitle>
                <CardDescription>Your academic journey so far.</CardDescription>
                <Button onClick={handleAddEducation} size="sm" variant="outline" className="mt-2 self-start">
                  <Plus className="mr-1 h-3 w-3" /> Add education
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {form.education.length === 0 && (
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                    Add your university, bootcamp, or any learning programs that shaped you.
                  </div>
                )}
                {form.education.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
                    <div className="mb-3 flex justify-between text-xs text-muted-foreground">
                      <span>Entry {index + 1}</span>
                      <button type="button" onClick={() => handleRemoveEducation(index)} className="text-destructive hover:underline">
                        Remove
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">School</div>
                        <Input value={item.institution} onChange={(e) => handleEducationChange(index, 'institution', e.target.value)} placeholder="University name" />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Degree</div>
                          <Input value={item.degree} onChange={(e) => handleEducationChange(index, 'degree', e.target.value)} placeholder="B.S. Design" />
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Field</div>
                          <Input value={item.fieldOfStudy} onChange={(e) => handleEducationChange(index, 'fieldOfStudy', e.target.value)} placeholder="Human-Computer Interaction" />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Start</div>
                          <Input type="date" value={item.startDate} onChange={(e) => handleEducationChange(index, 'startDate', e.target.value)} />
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">End</div>
                          <Input type="date" value={item.endDate} onChange={(e) => handleEducationChange(index, 'endDate', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        {role === 'student' && (
          <section className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow">
            <h2 className="text-lg font-semibold">Visibility controls</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tune who can discover your profile and what they see first.</p>
            <div className="mt-4">
              <ProfileVisibilitySettings />
            </div>
          </section>
        )}

        {role === 'student' && (
          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {studentStats.map((stat) => (
                <MetricCard key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} loading={progressLoading} />
              ))}
            </div>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg">Recent applications</CardTitle>
                <CardDescription>Track where you are in each hiring journey.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {appsLoading && <ApplicationsListSkeleton rows={4} />}
                {!appsLoading && applications.length === 0 && (
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                    No applications yet—when you apply, we will chart the journey here.
                  </div>
                )}
                {!appsLoading && applications.length > 0 && (
                  <div className="space-y-3">
                    {applications.map((app) => {
                      const status = app.status || 'applied'
                      const stages = ['applied', 'screening', 'interview', 'offer']
                      const index = status === 'rejected' ? 0 : Math.max(stages.indexOf(status), 0)
                      return (
                        <div key={app._id} className="rounded-2xl border border-border/60 bg-card/70 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-medium">{app.opportunity?.title || 'Opportunity'}</div>
                              <div className="text-xs text-muted-foreground">{app.opportunity?.type || '—'}</div>
                            </div>
                            <Badge variant={status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">
                              {status}
                            </Badge>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            {stages.map((stage, sIndex) => (
                              <div key={stage} className="flex-1">
                                <div className={`h-2 rounded-full ${sIndex <= index ? 'bg-primary' : 'bg-muted'}`} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {role === 'employer' && (
          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {employerStats.map((stat) => (
                <MetricCard key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} loading={employerLoading} />
              ))}
            </div>
          </section>
        )}

        {role === 'student' && (
          <section className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg">Resume</CardTitle>
                <CardDescription>Upload a crisp PDF to keep recruiters on your wavelength.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <UploadCard
                  title="Resume"
                  description="Upload a PDF resume"
                  accept="application/pdf"
                  value={resumeFile}
                  onSelect={(file) => {
                    setResumeFile(file)
                    handleUpload('resume', file)
                  }}
                  helper={mediaMeta.resume ? `Last uploaded ${mediaMeta.resume.name}` : 'PDF format works best.'}
                />
                {uploading && resumeFile && <div className="text-xs text-muted-foreground">Uploading resume...</div>}
                {!uploading && mediaMeta.resume?.uploadedAt && (
                  <div className="text-xs text-muted-foreground">
                    Updated {timeAgo(new Date(mediaMeta.resume.uploadedAt).getTime())}
                  </div>
                )}
                {!uploading && mediaMeta.resume?.fileId && (
                  <button
                    type="button"
                    onClick={handleResumeView}
                    className="text-xs text-primary hover:underline disabled:opacity-60"
                    disabled={viewingResume}
                  >
                    {viewingResume ? 'Opening…' : 'View current resume'}
                  </button>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg">Intro video</CardTitle>
                <CardDescription>Share your vibe in under a minute.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <UploadCard
                  title="Intro video"
                  description="Record or upload a quick hello"
                  accept="video/mp4,video/webm"
                  value={videoFile}
                  onSelect={(file) => {
                    setVideoFile(file)
                    handleUpload('video', file)
                  }}
                  helper={mediaMeta.video ? `Saved ${mediaMeta.video.name}` : 'Video sharing arrives soon.'}
                  comingSoon
                />
                {uploading && videoFile && <div className="text-xs text-muted-foreground">Saving video metadata...</div>}
              </CardContent>
            </Card>
          </section>
        )}

        {role === 'admin' && (
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg">Admin overview</CardTitle>
              <CardDescription>Quick glimpse at platform health.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>• Total users, listings, and momentum stats (coming soon)</div>
              <div>• Quick actions for platform nudges</div>
            </CardContent>
          </Card>
        )}

        <details className="rounded-3xl border border-border/60 bg-background/70 p-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer text-sm text-foreground">Debug data</summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/80 p-4">{JSON.stringify({ profile, form }, null, 2)}</pre>
        </details>
      </div>

      <AvatarCropDialog
        open={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        onSaved={async (file) => {
          try {
            const token = localStorage.getItem('token')
            const fd = new FormData()
            fd.append('file', file)
            await axios.post('/api/profile/avatar', fd, {
              headers: { Authorization: `Bearer ${token}` }
            })
            setAvatarOpen(false)
            setProfile((prev) => ({ ...prev, profilePictureUrl: `/api/profile/avatar/download?ts=${Date.now()}` }))
            toast.push({ title: 'Avatar updated' })
          } catch (err) {
            const msg = err.response?.data?.message || err.message
            toast.push({ title: 'Avatar upload failed', description: msg, variant: 'destructive' })
          }
        }}
      />

      {dirty && (
        <div className="fixed inset-x-0 bottom-6 z-40">
          <div className="mx-auto flex max-w-3xl items-center justify-between rounded-full bg-background/95 px-6 py-3 shadow-xl shadow-indigo-500/20 ring-1 ring-border/60">
            <div className="text-sm font-medium">You have unsaved edits</div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => { setForm(buildForm(profile)); setDirty(false) }}>
                Reset
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


