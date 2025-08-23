import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import CreatableSelect from 'react-select/creatable'

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

  function validate() {
    const e = {}
    if (!fullName.trim()) e.fullName = 'Full name is required.'
    if (graduationYear) {
      const yr = Number(graduationYear)
      if (Number.isNaN(yr)) e.graduationYear = 'Graduation year must be a number.'
      else if (yr < 1900 || yr > 2100) e.graduationYear = 'Graduation year must be between 1900 and 2100.'
    }
    // optional: require at least one skill
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
      setMessage({ type: 'success', text: 'Profile saved.' })
      setTimeout(() => navigate('/opportunities'), 700)
    } catch (err) {
      console.error(err)
      const text = err?.response?.data?.message || err.message || 'Request failed.'
      setMessage({ type: 'error', text })
    } finally {
      setLoading(false)
    }
  }

  const selectValue = skills.map(s => ({ label: s, value: s }))

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: 12 }}>
      <h2>Create Student Profile</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Full name</label>
          <br />
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
          {errors.fullName && <div style={{ color: 'crimson' }}>{errors.fullName}</div>}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>College</label>
          <br />
          <input
            type="text"
            value={college}
            onChange={e => setCollege(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Graduation year</label>
          <br />
          <input
            type="number"
            value={graduationYear}
            onChange={e => setGraduationYear(e.target.value)}
            style={{ width: 200, padding: 8 }}
          />
          {errors.graduationYear && <div style={{ color: 'crimson' }}>{errors.graduationYear}</div>}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Major</label>
          <br />
          <input
            type="text"
            value={major}
            onChange={e => setMajor(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Skills</label>
          <CreatableSelect
            isMulti
            onChange={items => setSkills(items ? items.map(i => i.value) : [])}
            value={selectValue}
            placeholder="Add skills..."
          />
          {errors.skills && <div style={{ color: 'crimson' }}>{errors.skills}</div>}
        </div>

        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={loading} style={{ padding: '10px 16px' }}>
            {loading ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </form>

      {message && (
        <div style={{ marginTop: 12, color: message.type === 'error' ? 'crimson' : 'green' }}>{message.text}</div>
      )}
    </div>
  )
}
