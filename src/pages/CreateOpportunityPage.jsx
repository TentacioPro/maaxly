import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card'
import { Input, Label } from '../components/ui/input'
import { Button } from '../components/ui/button'
import DatePicker from '../components/DatePicker'
import { useToast } from '../components/ui/toast'

export default function CreateOpportunityPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('job')
  const [location, setLocation] = useState('')
  const [skillset, setSkillset] = useState('')
  const [requirements, setRequirements] = useState('')
  const [applicationDeadline, setApplicationDeadline] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!title || !type) {
        toast.push({ title: 'Validation', description: 'Please provide title and type', variant: 'destructive' })
      return
    }

    if (!contactEmail && !contactPhone) {
        toast.push({ title: 'Validation', description: 'Provide at least one contact detail (email or phone)', variant: 'destructive' })
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
        toast.push({ title: 'Not allowed', description: 'You must be logged in as an employer to create an opportunity', variant: 'destructive' })
      return
    }

    const payload = {
      title,
      description,
      type,
  location,
  skillset: skillset || undefined,
  requirements: requirements || undefined,
  applicationDeadline: applicationDeadline || undefined,
  contactEmail: contactEmail || undefined,
  contactPhone: contactPhone || undefined
    }

    setLoading(true)
    try {
      await axios.post('/api/opportunities', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      navigate('/dashboard', { state: { fromCreate: true } })
    } catch (err) {
      console.error('Create opportunity error', err)
      const msg = err?.response?.data?.message || err.message || 'Failed to create opportunity'
        toast.push({ title: 'Create failed', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto my-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Create Opportunity</h2>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className="w-full rounded-md border p-2" />
            </div>

            <div>
              <Label htmlFor="skillset">Skillset</Label>
              <Input id="skillset" value={skillset} onChange={(e) => setSkillset(e.target.value)} placeholder="Comma separated skills" />
            </div>

            <div>
              <Label htmlFor="requirements">Requirements</Label>
              <textarea id="requirements" value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3} className="w-full rounded-md border p-2" />
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <select id="type" value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-md border p-2">
                <option value="job">Job</option>
                <option value="internship">Internship</option>
                <option value="competition">Competition</option>
              </select>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input id="contactEmail" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="hr@example.com" />
            </div>

            <div>
              <Label htmlFor="contactPhone">Contact phone</Label>
              <Input id="contactPhone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1-555-555-555" />
            </div>

            <div>
              <Label htmlFor="applicationDeadline">Application Deadline</Label>
              <div>
                <DatePicker value={applicationDeadline} onChange={(v) => setApplicationDeadline(v)} />
              </div>
            </div>

            {/* errors shown via toasts */}
          </CardContent>

          <CardFooter>
            <div className="flex justify-end w-full">
              <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create Opportunity'}</Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
