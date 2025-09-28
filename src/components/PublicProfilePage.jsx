import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

function HeroBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute left-1/2 top-[-10rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[160px]" />
      <div className="absolute left-[15%] top-[30%] h-[18rem] w-[18rem] rounded-full bg-accent/10 blur-[120px]" />
      <div className="absolute right-[12%] top-[15%] h-[22rem] w-[22rem] rounded-full bg-muted/30 blur-[140px]" />
    </div>
  )
}

function Watermark({ username }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center opacity-30">
      <div className="flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-4 py-1 text-xs uppercase tracking-[0.35em]">
        <span>Maaxly</span>
        {username ? <span className="text-muted-foreground">•</span> : null}
        {username ? <span className="tracking-[0.15em] lowercase">{username}</span> : null}
      </div>
    </div>
  )
}

const HERO_HEIGHT = 320

export default function PublicProfilePage({ username, publicId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState(null)
  const fetchUrl = useMemo(() => {
    if (publicId) return `/api/profile/id/${encodeURIComponent(publicId)}`
    if (username) return `/api/profile/username/${encodeURIComponent(username)}`
    return null
  }, [username, publicId])

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      if (!fetchUrl) return
      try {
        setLoading(true)
        setError(null)
        const res = await axios.get(fetchUrl)
        if (!cancelled) setProfile(res?.data?.profile || null)
      } catch (err) {
        if (!cancelled) {
          const message = err?.response?.data?.message || err?.message || 'Failed to load profile'
          setError(message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [fetchUrl])

  if (loading) {
    return (
      <div className="relative min-h-screen bg-background text-muted-foreground">
        <HeroBackground />
        <div className="flex min-h-screen items-center justify-center">
          <div className="rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm shadow-sm shadow-primary/10">Loading profile…</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-background">
        <HeroBackground />
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-4 text-destructive">{error}</div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="relative min-h-screen bg-background">
        <HeroBackground />
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="rounded-xl border border-border/60 bg-background/80 px-6 py-4 text-muted-foreground">Profile not found</div>
        </div>
      </div>
    )
  }

  const openTo = profile?.preferences?.jobSearchStatus === 'OPEN_TO_OPPORTUNITIES' || profile?.preferences?.jobSearchStatus === 'ACTIVELY_APPLYING'
  const skills = Array.isArray(profile.skills)
    ? profile.skills.map((s) => (typeof s === 'string' ? s : (s && s.name) || '')).filter(Boolean)
    : []
  const experience = Array.isArray(profile.experience) ? profile.experience : []
  const education = Array.isArray(profile.education) ? profile.education : []

  let avatarUrl = '/vite.svg'
  if (profile?.publicId) {
    avatarUrl = `/api/profile/avatar/${encodeURIComponent(profile.publicId)}`
  } else if (profile?.username) {
    avatarUrl = `/api/profile/avatar/username/${encodeURIComponent(profile.username)}`
  } else if (profile?.profilePictureUrl) {
    avatarUrl = profile.profilePictureUrl
  }

  const formattedLinks = [
    { label: 'Portfolio', value: profile.links?.portfolio },
    { label: 'GitHub', value: profile.links?.github },
    { label: 'LinkedIn', value: profile.links?.linkedin },
  ].filter((item) => item.value)

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <HeroBackground />
      <header
        className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-10 pb-6 sm:px-6 lg:px-8"
        style={{ minHeight: HERO_HEIGHT }}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
              Public profile
            </span>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {profile.fullName || profile.username}
            </h1>
          </div>
          <div className="hidden sm:block" aria-hidden="true">
            <div className="grid h-16 w-28 translate-y-2 gap-2 opacity-40">
              <span className="h-full rounded-xl border border-border/40 bg-muted/60" />
              <span className="h-full rounded-xl border border-border/40 bg-muted/40" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {profile.location && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/80 px-3 py-1">
              <span aria-hidden="true">📍</span>
              {profile.location}
            </span>
          )}
          {profile.username && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/80 px-3 py-1">
              @{profile.username}
            </span>
          )}
          {openTo && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/40 bg-emerald-500/15 px-3 py-1 text-emerald-400">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-400" />
              Open to opportunities
            </span>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-5xl gap-6 px-4 pb-24 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:px-8">
        <section className="space-y-6">
          <article className="rounded-3xl border border-border/60 bg-background/95 p-6 shadow-xl shadow-primary/5 backdrop-blur">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-3xl border border-border/60 shadow-lg">
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/vite.svg'
                  }}
                />
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-lg font-medium text-foreground">{profile.headline || 'Emerging talent'}</p>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {profile.bio || 'This student is polishing their story. Check back soon!'}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-border/60 bg-background/95 p-6 shadow-lg shadow-primary/5 backdrop-blur">
            <header className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Experience</h2>
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Timeline</span>
            </header>
            <div className="mt-6 space-y-6">
              {experience.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border/40 bg-muted/10 p-5 text-sm text-muted-foreground">
                  This student is preparing their experience highlights.
                </p>
              )}
              {experience.map((item, index) => (
                <div key={`exp-${index}`} className="rounded-2xl border border-border/60 bg-background/90 p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-medium text-foreground">{item.title || 'Experience role'}</h3>
                      <p className="text-sm text-muted-foreground">{item.company || 'Organisation'}</p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {[item.startDate, item.endDate]
                        .map((date, idx) => {
                          if (!date) return idx === 1 ? 'Present' : ''
                          const formatted = new Date(date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                          return formatted
                        })
                        .filter(Boolean)
                        .join(' — ')}
                    </p>
                  </div>
                  {item.description && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-border/60 bg-background/95 p-6 shadow-lg shadow-primary/5 backdrop-blur">
            <header className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Education</h2>
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Growth</span>
            </header>
            <div className="mt-6 space-y-6">
              {education.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border/40 bg-muted/10 p-5 text-sm text-muted-foreground">
                  Academic journey coming soon.
                </p>
              )}
              {education.map((item, index) => (
                <div key={`edu-${index}`} className="rounded-2xl border border-border/60 bg-background/90 p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-medium text-foreground">{item.institution || 'Institution'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {[item.degree, item.fieldOfStudy].filter(Boolean).join(' • ') || 'In progress'}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {[item.startDate, item.endDate]
                        .map((date, idx) => {
                          if (!date) return idx === 1 ? 'Present' : ''
                          const formatted = new Date(date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                          return formatted
                        })
                        .filter(Boolean)
                        .join(' — ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-border/60 bg-background/95 p-6 shadow-lg shadow-primary/5 backdrop-blur">
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Signature skills</h3>
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Core</span>
            </header>
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.length ? (
                skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="rounded-2xl border border-dashed border-border/50 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                  Skills will appear here once they’re shared publicly.
                </span>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-background/95 p-6 shadow-lg shadow-primary/5 backdrop-blur">
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Connect</h3>
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Links</span>
            </header>
            <ul className="mt-4 space-y-3 text-sm">
              {formattedLinks.length === 0 && (
                <li className="rounded-2xl border border-dashed border-border/50 bg-muted/10 px-4 py-3 text-muted-foreground">
                  Social links will drop here soon.
                </li>
              )}
              {formattedLinks.map((link) => (
                <li key={link.label}>
                  <a
                    className="group flex items-center justify-between rounded-2xl border border-border/60 bg-background/80 px-4 py-3 transition hover:border-primary/60 hover:bg-primary/10"
                    href={link.value}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="text-sm font-medium text-foreground">{link.label}</span>
                    <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground transition group-hover:text-primary">Visit</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </main>

      <Watermark username={profile.username} />
    </div>
  )
}
