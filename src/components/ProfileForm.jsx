import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardContent, CardFooter } from './ui/card'
import { Input, Label } from './ui/input'
import { Button } from './ui/button'

export default function ProfileForm() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('student')
  const [bio, setBio] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // route user to role-specific profile creation page
    if (role === 'student') return navigate('/create-profile/student')
    return navigate('/create-profile/employer')
  }

  return (
    <div className="max-w-lg mx-auto mt-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Your Profile</h3>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-md border p-2">
                <option value="student">Student</option>
                <option value="employer">Employer</option>
              </select>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="w-full rounded-md border p-2" rows={4} />
            </div>
          </CardContent>

          <CardFooter>
            <div className="w-full flex justify-end">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Profile'}</Button>
            </div>
          </CardFooter>
        </form>
      </Card>

      {message && <div className={`mt-3 ${message.type === 'error' ? 'text-destructive' : 'text-green-600'}`}>{message.text}</div>}
    </div>
  )
}
