import React, { useEffect, useState } from 'react'
import axios from 'axios'

const TABS = ['Overview', 'Experience', 'Education', 'Preferences']

export default function ProfileEditForm({ initial, onSaved }) {
  const [activeTab, setActiveTab] = useState('Overview')
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    fullName: '',
    username: '',
    profilePictureUrl: '',
    location: '',
    headline: '',
    bio: '',
    links: { portfolio: '', github: '', linkedin: '' },
    skills: [],
    experience: [],
    education: [],
    preferences: {
      jobSearchStatus: 'NOT_LOOKING',
      primaryRole: '',
      openToRoles: [],
      salaryExpectation: ''
    }
  })

  // Prefill when initial provided
  useEffect(() => {
    if (!initial) return
    setProfileData(prev => ({
      ...prev,
      fullName: initial.fullName || '',
      username: initial.username || '',
      profilePictureUrl: initial.profilePictureUrl || '',
      location: initial.location || '',
      headline: initial.headline || '',
      bio: initial.bio || '',
      links: {
        portfolio: initial.links?.portfolio || '',
        github: initial.links?.github || '',
        linkedin: initial.links?.linkedin || ''
      },
      preferences: {
        jobSearchStatus: initial.preferences?.jobSearchStatus || 'NOT_LOOKING',
        primaryRole: initial.preferences?.primaryRole || '',
        openToRoles: initial.preferences?.openToRoles || [],
        salaryExpectation: initial.preferences?.salaryExpectation || ''
      }
    }))
  }, [initial])

  function onChange(path, value) {
    setProfileData((prev) => {
      const next = { ...prev }
      const parts = path.split('.')
      let obj = next
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i]
        obj[k] = obj[k] || {}
        obj = obj[k]
      }
      obj[parts[parts.length - 1]] = value
      return next
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const payload = {
        fullName: profileData.fullName,
        bio: profileData.bio,
        // new top-level fields
        username: profileData.username,
        profilePictureUrl: profileData.profilePictureUrl,
        location: profileData.location,
        headline: profileData.headline,
        links: profileData.links,
        preferences: profileData.preferences
      }
      const res = await axios.patch('/api/profile', payload, { headers })
      const updated = res?.data?.profile || null
      if (updated && typeof onSaved === 'function') onSaved(updated)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="border-b mb-6">
        <nav className="flex -mb-px space-x-6" aria-label="Tabs">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={
                'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ' +
                (activeTab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-foreground')
              }
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={profileData.fullName}
                onChange={(e) => onChange('fullName', e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={profileData.username}
                onChange={(e) => onChange('username', e.target.value)}
                placeholder="jane-doe"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Profile Picture URL</label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={profileData.profilePictureUrl}
                onChange={(e) => onChange('profilePictureUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={profileData.location}
                onChange={(e) => onChange('location', e.target.value)}
                placeholder="San Francisco, CA"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Headline</label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={profileData.headline}
                onChange={(e) => onChange('headline', e.target.value)}
                placeholder="Frontend Developer • React • UI"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Bio</label>
              <textarea
                className="w-full min-h-[120px] border rounded-md px-3 py-2 bg-background"
                value={profileData.bio}
                onChange={(e) => onChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Portfolio</label>
                <input
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={profileData.links.portfolio}
                  onChange={(e) => onChange('links.portfolio', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">GitHub</label>
                <input
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={profileData.links.github}
                  onChange={(e) => onChange('links.github', e.target.value)}
                  placeholder="https://github.com/username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">LinkedIn</label>
                <input
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={profileData.links.linkedin}
                  onChange={(e) => onChange('links.linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Experience' && (
          <div className="p-6 border rounded-md text-muted-foreground">This section is under construction.</div>
        )}

        {activeTab === 'Education' && (
          <div className="p-6 border rounded-md text-muted-foreground">This section is under construction.</div>
        )}

        {activeTab === 'Preferences' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary Role</label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={profileData.preferences.primaryRole}
                onChange={(e) => onChange('preferences.primaryRole', e.target.value)}
                placeholder="e.g. Frontend Engineer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Salary Expectation</label>
              <input
                type="number"
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={profileData.preferences.salaryExpectation}
                onChange={(e) => onChange('preferences.salaryExpectation', e.target.value)}
                placeholder="e.g. 90000"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Job Search Status</label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={profileData.preferences.jobSearchStatus}
                onChange={(e) => onChange('preferences.jobSearchStatus', e.target.value)}
              >
                <option value="NOT_LOOKING">Not looking</option>
                <option value="OPEN_TO_OPPORTUNITIES">Open to opportunities</option>
                <option value="ACTIVELY_APPLYING">Actively applying</option>
              </select>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 hover:opacity-95 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
