import React, { createContext, useContext, useRef } from 'react'
import axios from 'axios'

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  // simple in-memory cache: { userId: { profile, expiresAt } }
  const cacheRef = useRef({})

  async function fetchProfile(userId, { force = false } = {}) {
    if (!userId) return null
    const now = Date.now()
    const cached = cacheRef.current[userId]
    if (!force && cached && cached.expiresAt > now) return cached.profile
    try {
      const res = await axios.get(`/api/profiles/${userId}`)
      const profile = res.data && res.data.profile ? res.data.profile : null
      cacheRef.current[userId] = { profile, expiresAt: now + 60 * 1000 }
      return profile
    } catch (e) {
      return null
    }
  }

  function invalidate(userId) {
    if (!userId) return
    delete cacheRef.current[userId]
  }

  return (
    <ProfileContext.Provider value={{ fetchProfile, invalidate }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
