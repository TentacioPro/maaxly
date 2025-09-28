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
      // Try new student public endpoint first
      let profile = null
      try {
        const res = await axios.get(`/api/profile/id/${encodeURIComponent(userId)}`)
        profile = res.data && res.data.profile ? res.data.profile : null
      } catch (e) {
        // fallback to legacy endpoint if not found
        try {
          const res2 = await axios.get(`/api/profiles/${userId}`)
          profile = res2.data && res2.data.profile ? res2.data.profile : null
        } catch {}
      }
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
