import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function OpportunitiesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('job')

  const fetchItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get('/api/opportunities')
      setItems(res.data.opportunities || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/opportunities', { title, description, type })
      setTitle('')
      setDescription('')
      setType('job')
      fetchItems()
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h2>Opportunities</h2>

      <form onSubmit={handleCreate} style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: 8 }}>
            <option value="job">Job</option>
            <option value="internship">Internship</option>
            <option value="competition">Competition</option>
          </select>
        </div>
        <button type="submit">Create</button>
      </form>

      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'crimson' }}>{error}</div>}

      <ul>
        {items.map((it) => (
          <li key={it._id} style={{ marginBottom: 12 }}>
            <strong>{it.title}</strong> <em>({it.type})</em>
            <div>{it.description}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
