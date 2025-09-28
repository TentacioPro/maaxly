import React from 'react'
import { useParams } from 'react-router-dom'
import PublicProfilePage from '@/components/PublicProfilePage'

export default function PublicProfileRoute() {
  const params = useParams()
  const username = params.username
  const publicId = params.publicId
  return <PublicProfilePage username={username} publicId={publicId} />
}
