import React from 'react'
import ProfileEditForm from '@/components/ProfileEditForm'
import PublicProfilePage from '@/components/PublicProfilePage'

export default function ProfilePage() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Public Profile</h1>
        <p className="text-sm text-muted-foreground mb-4">Previewing public profile for @jane-doe</p>
        <PublicProfilePage username="jane-doe" />
      </div>

      <div className="h-px bg-border" />

      <div>
        <h2 className="text-xl font-semibold mb-2">Edit Your Profile</h2>
        <p className="text-sm text-muted-foreground mb-4">This is a local form preview. Wire it to PATCH /api/profile to save.</p>
        <ProfileEditForm />
      </div>
    </div>
  )
}
