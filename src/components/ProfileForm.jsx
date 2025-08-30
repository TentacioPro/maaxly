import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardContent, CardFooter } from './ui/card'
import { Input, Label } from './ui/input'
import { Textarea } from './ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select'
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
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role" className="w-full"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="employer">Employer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2 border-t p-4">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Profile'}</Button>
          </CardFooter>
        </form>
      </Card>

      {message && <div className={`mt-3 ${message.type === 'error' ? 'text-destructive' : 'text-green-600'}`}>{message.text}</div>}
    </div>
  )
}
