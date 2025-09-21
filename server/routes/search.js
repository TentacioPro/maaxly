import express from 'express'
import User from '../models/User.js'
import StudentProfile from '../models/StudentProfile.js'
import EmployerProfile from '../models/EmployerProfile.js'
import redisClient from '../redis/client.js'

const router = express.Router()

// GET /api/users/search?query=
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.query || '').toString().trim()
    if (!q) return res.json({ success: true, users: [] })

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

    // Search users by email (exclude self)
    const usersByEmail = await User.find({ email: { $regex: regex }, _id: { $ne: req.userId } })
      .select('_id email role isEmployer isStudent')
      .limit(10)
      .lean()

    // Search profiles for name/company matches
    const [studentProfiles, employerProfiles] = await Promise.all([
      StudentProfile.find({ fullName: { $regex: regex } }).select('userId fullName college').limit(10).lean(),
      EmployerProfile.find({ $or: [{ fullName: { $regex: regex } }, { companyName: { $regex: regex } }] })
        .select('userId fullName companyName')
        .limit(10)
        .lean()
    ])

    const profileUserIds = Array.from(new Set([
      ...studentProfiles.map(p => String(p.userId)),
      ...employerProfiles.map(p => String(p.userId))
    ]))

    const usersFromProfiles = await User.find({ _id: { $in: profileUserIds, $ne: req.userId } })
      .select('_id email role isEmployer isStudent')
      .lean()

    // Build unified list with lightweight profile info
    const byId = new Map()
    const add = (u) => {
      const id = String(u._id)
      if (!byId.has(id)) byId.set(id, { id, email: u.email, role: u.role, isEmployer: u.isEmployer, isStudent: u.isStudent })
    }
    usersByEmail.forEach(add)
    usersFromProfiles.forEach(add)

    const studentsByUser = Object.fromEntries(studentProfiles.map(p => [String(p.userId), p]))
    const employersByUser = Object.fromEntries(employerProfiles.map(p => [String(p.userId), p]))

    const results = Array.from(byId.values()).map(u => {
      const s = studentsByUser[u.id]
      const e = employersByUser[u.id]
      return {
        ...u,
        profile: s
          ? { type: 'student', fullName: s.fullName, college: s.college }
          : e
            ? { type: 'employer', fullName: e.fullName, companyName: e.companyName }
            : null
      }
    })

    // Basic prioritization: exact email match first, then others
    const lowerQ = q.toLowerCase()
    results.sort((a, b) => {
      const aExact = a.email.toLowerCase() === lowerQ ? 0 : 1
      const bExact = b.email.toLowerCase() === lowerQ ? 0 : 1
      if (aExact !== bExact) return aExact - bExact
      return a.email.localeCompare(b.email)
    })

    res.json({ success: true, users: results.slice(0, 20) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/users/:id/presence - lightweight presence info (returns 200 with presence or 404)
router.get('/:id/presence', async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ message: 'user id required' })
    // If Redis is available, attempt to read a last-seen key
    try {
      if (redisClient && typeof redisClient.get === 'function') {
        const key = `presence:${id}`
        const val = await redisClient.get(key)
        if (val) {
          // store may contain JSON with { lastSeen, status }
          try { const parsed = JSON.parse(val); return res.json({ success: true, presence: parsed }) } catch (_) { return res.json({ success: true, presence: { lastSeen: val } }) }
        }
      }
    } catch (e) {
      // ignore redis errors and fallthrough to offline
    }
    // default offline / unknown
    return res.status(200).json({ success: true, presence: { status: 'offline' } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

export default router

