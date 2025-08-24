import React, { useState } from 'react'
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
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [errors, setErrors] = useState({})
  const toast = useToast()

  function validate() {
    const e = {}
    if (!fullName.trim()) e.fullName = 'Full name is required.'
    if (graduationYear) {
      const yr = Number(graduationYear)
      if (Number.isNaN(yr)) e.graduationYear = 'Graduation year must be a number.'
      else if (yr < 1900 || yr > 2100) e.graduationYear = 'Graduation year must be between 1900 and 2100.'
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

  return (
    <div style={{ maxWidth: 980, margin: '28px auto', padding: '0 12px' }}>
      <Card className="w-full" style={{ padding: 20, minWidth: 520 }}>
        <CardHeader>
          <h2 className="text-lg font-semibold">Create Student Profile</h2>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full max-w-2xl" />
              {errors.fullName && <div className="text-destructive">{errors.fullName}</div>}
            </div>

            <div>
              <Label htmlFor="college">College</Label>
              <Input id="college" value={college} onChange={e => setCollege(e.target.value)} className="w-full max-w-2xl" />
            </div>

            <div>
              <Label htmlFor="graduationYear">Graduation year</Label>
              <Input id="graduationYear" type="number" value={graduationYear} onChange={e => setGraduationYear(e.target.value)} className="w-48" />
              {errors.graduationYear && <div className="text-destructive">{errors.graduationYear}</div>}
            </div>

            <div>
              <Label htmlFor="major">Major</Label>
              <Input id="major" value={major} onChange={e => setMajor(e.target.value)} className="w-full max-w-2xl" />
            </div>

            <div>
              <Label>Skills</Label>
              <div className="w-full">
                <CreatableSelect
                  isMulti
                  onChange={items => setSkills(items ? items.map(i => i.value) : [])}
                  value={selectValue}
                  placeholder="Add skills..."
                />
              </div>
              {errors.skills && <div className="text-destructive">{errors.skills}</div>}
            </div>

            {message && <div className={`${message.type === 'error' ? 'text-destructive' : 'text-green-600'}`}>{message.text}</div>}
          </CardContent>

      <CardFooter>
            <div className="flex justify-end w-full">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save profile'}</Button>
            </div>
          </CardFooter>
        </form>
    </Card>
    </div>
  )
}
