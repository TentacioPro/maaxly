import React, { useState } from 'react'
import axios from 'axios'
import CreatableSelect from 'react-select/creatable'
import { Input, Label } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import DatePicker from '@/components/DatePicker'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

export default function OpportunityForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Create Opportunity',
}) {
  const [values, setValues] = useState(() => ({
    title: '',
    description: '',
    type: 'job',
    location: '',
    skillset: '',
    requirements: '',
    applicationDeadline: '',
    contactEmail: '',
    contactPhone: '',
    ...(initialValues || {}),
  }))
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  // Skills autosuggest state (reuse logic from student onboarding)
  function parseSkills(str) {
    return String(str || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  }
  const [skills, setSkills] = useState(() => parseSkills((initialValues && initialValues.skillset) || values.skillset))
  const [skillOptions, setSkillOptions] = useState([])
  const [skillLoading, setSkillLoading] = useState(false)

  // Themed styles for react-select using app tokens (works with ThemeProvider)
  const themedSelectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: 'var(--input)',
      borderColor: state.isFocused ? 'var(--ring)' : 'var(--border)',
      boxShadow: 'none',
      ':hover': { borderColor: 'var(--ring)' },
      color: 'var(--foreground)',
      minHeight: 40,
      borderRadius: 'var(--radius)',
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '2px 8px',
    }),
    input: (base) => ({
      ...base,
      color: 'var(--foreground)',
    }),
    placeholder: (base) => ({
      ...base,
      color: 'var(--muted-foreground)',
    }),
    singleValue: (base) => ({
      ...base,
      color: 'var(--foreground)',
    }),
    indicatorsContainer: (base) => ({
      ...base,
      color: 'var(--muted-foreground)',
    }),
    clearIndicator: (base) => ({
      ...base,
      color: 'var(--muted-foreground)',
      ':hover': { color: 'var(--foreground)' },
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: 'var(--muted-foreground)',
      ':hover': { color: 'var(--foreground)' },
    }),
    menuPortal: (base) => ({ ...base, zIndex: 60 }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'var(--popover)',
      color: 'var(--popover-foreground)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    }),
    menuList: (base) => ({
      ...base,
      padding: 4,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? 'var(--primary)'
        : state.isFocused
          ? 'var(--muted)'
          : 'transparent',
      color: state.isSelected ? 'var(--primary-foreground)' : 'var(--foreground)',
      ':active': {
        backgroundColor: state.isSelected ? 'var(--primary)' : 'var(--muted)',
      },
      borderRadius: 6,
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: 'var(--muted)',
      borderRadius: 6,
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: 'var(--foreground)',
      fontSize: '0.875rem',
      paddingRight: 2,
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: 'var(--muted-foreground)',
      ':hover': { backgroundColor: 'transparent', color: 'var(--foreground)' },
    }),
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

  function update(patch) {
    setValues(v => ({ ...v, ...patch }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    // Basic validation aligned with CreateOpportunityPage
    if (!values.title || !values.type) {
      toast.push({ title: 'Validation', description: 'Please provide title and type', variant: 'destructive' })
      return
    }
    if (!values.contactEmail && !values.contactPhone) {
      toast.push({ title: 'Validation', description: 'Provide at least one contact detail (email or phone)', variant: 'destructive' })
      return
    }

    const payload = {
      title: values.title,
      description: values.description,
      type: values.type,
      location: values.location,
      skillset: values.skillset || undefined,
      requirements: values.requirements || undefined,
      applicationDeadline: values.applicationDeadline || undefined,
      contactEmail: values.contactEmail || undefined,
      contactPhone: values.contactPhone || undefined,
    }

    setLoading(true)
    try {
      const result = await onSubmit(payload)
      // Reset if parent doesn’t maintain state
      setValues(v => ({ ...v, title: '', description: '', location: '', skillset: '', requirements: '', applicationDeadline: '', contactEmail: '', contactPhone: '', type: 'job' }))
      return result
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit'
      toast.push({ title: 'Create failed', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
      <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={values.title} onChange={(e) => update({ title: e.target.value })} required />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={values.description} onChange={(e) => update({ description: e.target.value })} rows={6} />
        </div>

        <div>
          <Label htmlFor="skillset">Skillset</Label>
          <div className="w-full">
            <CreatableSelect
              isMulti
              value={skills.map(s => ({ label: s, value: s }))}
              onChange={(items) => {
                const arr = items ? items.map(i => i.value) : []
                setSkills(arr)
                update({ skillset: arr.join(', ') })
              }}
              onInputChange={(value, action) => {
                if (action.action === 'input-change') fetchSkillSuggestions(value)
              }}
              options={skillOptions}
              isLoading={skillLoading}
              className="text-sm"
              styles={themedSelectStyles}
              classNamePrefix="rs"
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              placeholder="Add skills..."
              formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
              onCreateOption={async (inputValue) => {
                const name = (inputValue || '').trim()
                if (!name) return
                try {
                  const token = localStorage.getItem('token')
                  const headers = token ? { Authorization: `Bearer ${token}` } : {}
                  await axios.post('/api/skills', { name }, { headers })
                } catch (e) {
                  // ignore errors; add locally regardless
                }
                setSkills(prev => Array.from(new Set([...(prev || []), name])))
                setSkillOptions(prev => Array.from(new Set([...(prev || []), { label: name, value: name }])))
                update({ skillset: Array.from(new Set([...(skills || []), name])).join(', ') })
              }}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="requirements">Requirements</Label>
          <Textarea id="requirements" value={values.requirements} onChange={(e) => update({ requirements: e.target.value })} rows={3} />
        </div>

        <div>
          <Label htmlFor="type">Type</Label>
          <Select value={values.type} onValueChange={(v) => update({ type: v })}>
            <SelectTrigger id="type" className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="job">Job</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
              <SelectItem value="competition">Competition</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" value={values.location} onChange={(e) => update({ location: e.target.value })} />
        </div>

        <div>
          <Label htmlFor="applicationDeadline">Application Deadline</Label>
          <div>
            <DatePicker
              value={values.applicationDeadline}
              onChange={(v) => update({ applicationDeadline: v })}
              size="sm"
              appearance="input"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="contactEmail">Contact email</Label>
          <Input id="contactEmail" type="email" value={values.contactEmail} onChange={(e) => update({ contactEmail: e.target.value })} placeholder="hr@example.com" />
        </div>

        <div>
          <Label htmlFor="contactPhone">Contact phone</Label>
          <Input id="contactPhone" value={values.contactPhone} onChange={(e) => update({ contactPhone: e.target.value })} placeholder="+1-555-555-555" />
        </div>
      </div>

  <div className="flex justify-end gap-2 border-t p-4 shrink-0 bg-background/95">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        )}
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : submitLabel}</Button>
      </div>
    </form>
  )
}
