import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import CreatableSelect from 'react-select/creatable'
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card'
import { Input, Label } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { useToast } from '../components/ui/toast'

export default function CreateStudentProfilePage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [college, setCollege] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [major, setMajor] = useState('')
  const [skills, setSkills] = useState([])
  const [skillOptions, setSkillOptions] = useState([])
  const [skillLoading, setSkillLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [errors, setErrors] = useState({})
  const toast = useToast()

  // Disable app scroll while onboarding is open; restore on unmount
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function validate() {
    const e = {}
    if (!fullName.trim()) e.fullName = 'Full name is required.'
    if (graduationYear) {
      // Allow only 4-digit years in range 1900–2100 using regex (no negatives)
      const yearRegex = /^(19[0-9]{2}|20[0-9]{2}|2100)$/
      if (!yearRegex.test(graduationYear)) {
        e.graduationYear = 'Enter a valid 4-digit year (1900–2100).'
      }
    }
    if (skills.length === 0) e.skills = 'Please add at least one skill.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)
    if (!validate()) return
    setLoading(true)
    try {
      const payload = {
        fullName,
        college,
        graduationYear: graduationYear ? Number(graduationYear) : null,
        major,
        skills
      }

      const token = localStorage.getItem('token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

  await axios.post('/api/profile/student', payload, { headers })
  toast.push({ title: 'Profile saved', description: 'Student profile created. Redirecting to dashboard.' })
  setTimeout(() => navigate('/dashboard'), 700)
    } catch (err) {
      console.error(err)
  const text = err?.response?.data?.message || err.message || 'Request failed.'
  toast.push({ title: 'Save failed', description: text, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const selectValue = skills.map(s => ({ label: s, value: s }))

  function onGradYearChange(value) {
    // Keep only digits, max 4 chars
    const cleaned = String(value || '').replace(/\D/g, '').slice(0, 4)
    setGraduationYear(cleaned)
  }

  // Debounce helper
  function debounce(fn, delay = 250) {
    let t
    return (...args) => {
      clearTimeout(t)
      t = setTimeout(() => fn(...args), delay)
    }
  }

  const fetchSkillSuggestions = debounce(async (input) => {
    const q = (input || '').trim()
    if (q.length < 3) {
      setSkillOptions([])
      return
    }
    setSkillLoading(true)
    try {
      const res = await axios.get('/api/skills/suggest', { params: { q } })
      const items = (res.data?.skills || []).map(name => ({ label: name, value: name }))
      setSkillOptions(items)
    } catch (err) {
      // ignore suggest errors
    } finally {
      setSkillLoading(false)
    }
  }, 300)

  // Themed styles for react-select to match ThemeProvider tokens
  const themedSelectStyles = useMemo(() => ({
    control: (base, state) => ({
      ...base,
      backgroundColor: 'var(--input)',
      borderColor: state.isFocused ? 'var(--ring)' : 'var(--border)',
      boxShadow: 'none',
      ':hover': { borderColor: 'var(--ring)' },
      color: 'var(--foreground)',
      minHeight: 40,
      borderRadius: 'var(--radius)'
    }),
    valueContainer: (base) => ({ ...base, padding: '2px 8px' }),
    input: (base) => ({ ...base, color: 'var(--foreground)' }),
    placeholder: (base) => ({ ...base, color: 'var(--muted-foreground)' }),
    singleValue: (base) => ({ ...base, color: 'var(--foreground)' }),
    indicatorsContainer: (base) => ({ ...base, color: 'var(--muted-foreground)' }),
    clearIndicator: (base) => ({ ...base, color: 'var(--muted-foreground)', ':hover': { color: 'var(--foreground)' } }),
    dropdownIndicator: (base) => ({ ...base, color: 'var(--muted-foreground)', ':hover': { color: 'var(--foreground)' } }),
    menuPortal: (base) => ({ ...base, zIndex: 60 }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'var(--popover)',
      color: 'var(--popover-foreground)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden'
    }),
    menuList: (base) => ({ ...base, padding: 4 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? 'var(--primary)'
        : state.isFocused
          ? 'var(--muted)'
          : 'transparent',
      color: state.isSelected ? 'var(--primary-foreground)' : 'var(--foreground)',
      ':active': { backgroundColor: state.isSelected ? 'var(--primary)' : 'var(--muted)' },
      borderRadius: 6
    }),
    multiValue: (base) => ({ ...base, backgroundColor: 'var(--muted)', borderRadius: 6 }),
    multiValueLabel: (base) => ({ ...base, color: 'var(--foreground)', fontSize: '0.875rem', paddingRight: 2 }),
    multiValueRemove: (base) => ({ ...base, color: 'var(--muted-foreground)', ':hover': { backgroundColor: 'transparent', color: 'var(--foreground)' } })
  }), [])

  return (
    <div className="h-full w-full grid place-items-center px-3">
  <Card className="w-full max-w-[96vw] sm:max-w-[640px] lg:max-w-[880px] xl:max-w-[980px] 2xl:max-w-[1100px] bg-card text-card-foreground shadow max-h-[calc(100svh-2rem)] overflow-auto lg:max-h-none lg:overflow-visible">
        <CardHeader>
          <h2 className="text-lg font-semibold">Create Student Profile</h2>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full max-w-2xl mt-1.5" />
              {errors.fullName && <div className="text-sm text-destructive mt-1">{errors.fullName}</div>}
            </div>

            <div>
              <Label htmlFor="college">College</Label>
              <Input id="college" value={college} onChange={e => setCollege(e.target.value)} className="w-full max-w-2xl mt-1.5" />
            </div>

            <div>
              <Label htmlFor="graduationYear">Graduation year</Label>
              <Input
                id="graduationYear"
                type="text"
                inputMode="numeric"
                pattern="(19[0-9]{2}|20[0-9]{2}|2100)"
                title="Enter a 4-digit year between 1900 and 2100"
                maxLength={4}
                value={graduationYear}
                onChange={e => onGradYearChange(e.target.value)}
                className="w-48 mt-1.5"
                autoComplete="off"
              />
              {errors.graduationYear && <div className="text-sm text-destructive mt-1">{errors.graduationYear}</div>}
            </div>

            <div>
              <Label htmlFor="major">Major</Label>
              <Input id="major" value={major} onChange={e => setMajor(e.target.value)} className="w-full max-w-2xl mt-1.5" />
            </div>

      <div>
    <Label>Skills</Label>
        <div className="w-full mt-1.5">
                <CreatableSelect
                  isMulti
                  value={selectValue}
                  onChange={items => setSkills(items ? items.map(i => i.value) : [])}
                  onInputChange={(value, action) => {
                    if (action.action === 'input-change') fetchSkillSuggestions(value)
                  }}
                  options={skillOptions}
                  isLoading={skillLoading}
                  placeholder="Add skills..."
          styles={themedSelectStyles}
          classNamePrefix="rs"
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
                  onCreateOption={async (inputValue) => {
                    const name = (inputValue || '').trim()
                    if (!name) return
                    try {
                      const token = localStorage.getItem('token')
                      const headers = token ? { Authorization: `Bearer ${token}` } : {}
                      await axios.post('/api/skills', { name }, { headers })
                    } catch (e) {
                      // ignore conflicts or errors; we'll still add locally
                    }
                    setSkills(prev => Array.from(new Set([...(prev || []), name])))
                    setSkillOptions(prev => Array.from(new Set([...(prev || []), { label: name, value: name } ])))
                  }}
                />
              </div>
        {errors.skills && <div className="text-sm text-destructive mt-1">{errors.skills}</div>}
            </div>

            {message && <div className={`${message.type === 'error' ? 'text-destructive' : 'text-green-600'}`}>{message.text}</div>}
          </CardContent>

      <CardFooter className="flex justify-end gap-2 border-t p-4 bg-background/95">
        <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save profile'}</Button>
      </CardFooter>
        </form>
    </Card>
    </div>
  )
}
