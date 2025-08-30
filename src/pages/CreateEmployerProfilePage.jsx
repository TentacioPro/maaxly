import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card'
import { Input, Label } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { useToast } from '../components/ui/toast'

export default function CreateEmployerProfilePage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
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
    if (!companyName.trim()) e.companyName = 'Company name is required.'
    if (companyWebsite) {
      // Accept inputs like "google.com" or multi-level domains like "example.org.in"
      const normalize = (input) => {
        const s = input.trim()
        // add https:// if no scheme present
        if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return `https://${s}`
        return s
      }

      try {
        const parsed = new URL(normalize(companyWebsite))
        // hostname must contain at least one dot (e.g. example.com)
        if (!/\./.test(parsed.hostname)) e.companyWebsite = 'Company website must be a valid domain.'
      } catch (_) {
        e.companyWebsite = 'Company website must be a valid URL.'
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)
    if (!validate()) return
    setLoading(true)
    try {
      // ensure companyWebsite is sent with a scheme (https://) so backend URL validation passes
      const ensureScheme = (input) => {
        if (!input) return ''
        const s = input.trim()
        if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return `https://${s}`
        return s
      }

      const payload = { fullName, companyName, companyWebsite: companyWebsite ? ensureScheme(companyWebsite) : '' }
      const token = localStorage.getItem('token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      await axios.post('/api/profile/employer', payload, { headers })
  toast.push({ title: 'Profile saved', description: 'Employer profile created. Redirecting to opportunities.' })
  setTimeout(() => navigate('/opportunities'), 700)
    } catch (err) {
      console.error(err)
      const text = err?.response?.data?.message || err.message || 'Request failed.'
  toast.push({ title: 'Save failed', description: text, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full w-full grid place-items-center px-3">
  <Card className="w-full max-w-[96vw] sm:max-w-[640px] lg:max-w-[880px] xl:max-w-[980px] 2xl:max-w-[1100px] bg-card text-card-foreground shadow max-h-[calc(100svh-2rem)] overflow-auto lg:max-h-none lg:overflow-visible" style={{ padding: 20 }}>
        <CardHeader>
          <h2 className="text-lg font-semibold">Create Employer Profile</h2>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full max-w-2xl mt-1.5" />
              {errors.fullName && <div className="text-destructive">{errors.fullName}</div>}
            </div>

            <div>
              <Label htmlFor="companyName">Company name</Label>
              <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full max-w-2xl mt-1.5" />
              {errors.companyName && <div className="text-destructive">{errors.companyName}</div>}
            </div>

            <div>
              <Label htmlFor="companyWebsite">Company website</Label>
              {/* use text input to avoid native browser URL validation tooltip; we'll validate/normalize ourselves */}
              <Input id="companyWebsite" value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} className="w-full max-w-2xl mt-1.5" placeholder="example.com or https://example.com" />
              {errors.companyWebsite && <div className="text-destructive">{errors.companyWebsite}</div>}
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2 border-t p-4 bg-background/95">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save profile'}</Button>
          </CardFooter>
        </form>

  {/* top-level messages shown via toasts */}
      </Card>
    </div>
  )
}
