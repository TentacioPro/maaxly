import express from 'express'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import Profile from '../models/Profile.js'
import eventBus from '../lib/event-bus.js'
import { publishMessage } from '../kafka/producer.js'
import redisClient from '../redis/client.js'

const router = express.Router()

// Lightweight auth middleware: if a Bearer token is present, validate and attach req.userId.
// Otherwise continue as unauthenticated (public view).
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return next()
  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    req.userId = payload.sub
  } catch (e) {
    // ignore invalid token, proceed as anonymous
  }
  return next()
}

// Helper: filter profile by visibility for non-owners
function filterByVisibility(profileDoc, requesterId) {
  if (!profileDoc) return null
  const p = profileDoc.toObject ? profileDoc.toObject() : profileDoc
  // If requester is owner, return full profile including visibility
  if (requesterId && p.userId && String(requesterId) === String(p.userId)) return p
  const vis = p.visibility || {}
  const allowed = {}
  if (vis.displayName) allowed.displayName = p.displayName
  if (vis.fullName) allowed.fullName = p.fullName
  if (vis.email) allowed.email = p.email
  if (vis.title) allowed.title = p.title
  if (vis.bio) allowed.bio = p.bio
  if (vis.avatarUrl) allowed.avatarUrl = p.avatarUrl
  // include minimal meta
  allowed._id = p._id
  allowed.userId = p.userId
  return allowed
}

// GET public profile
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId
    const profile = await Profile.findOne({ userId: userId }).exec()
    if (!profile) return res.status(404).json({ error: 'Profile not found' })
    const filtered = filterByVisibility(profile, req.userId)
    return res.json({ profile: filtered })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

// PATCH visibility (owner only)
router.patch('/:userId/visibility', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId
    // auth check
    if (!req.userId || String(req.userId) !== String(userId)) {
      // No matching authenticated user; forbid
      return res.status(403).json({ error: 'Forbidden' })
    }
    const allowedKeys = ['displayName','fullName','email','title','bio','avatarUrl']
    const updates = {}
    if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid payload' })
    for (const k of allowedKeys) {
      if (k in req.body) updates[`visibility.${k}`] = !!req.body[k]
    }
    const profile = await Profile.findOneAndUpdate({ userId: userId }, { $set: updates }, { new: true }).exec()
    if (!profile) return res.status(404).json({ error: 'Profile not found' })
    // Emit event to invalidate caches
    try { eventBus.emit && eventBus.emit('profile:visibility:changed', { userId }) } catch (_) {}
    return res.json({ visibility: profile.visibility })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

// PATCH current user's profile (owner only) — update many fields
router.patch('/me', authMiddleware, async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' })
    const allowed = ['fullName','bio','college','major','graduationYear','companyName','companyWebsite','skills','visibility']
    const updates = {}
    if (req.body && typeof req.body === 'object') {
      for (const k of allowed) {
        if (k in req.body) updates[k] = req.body[k]
      }
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updatable fields provided' })
    const profile = await Profile.findOneAndUpdate({ userId: req.userId }, { $set: updates }, { new: true, upsert: true }).exec()
  // Emit profile updated event for internal listeners (SSE / cache invalidation)
  try { eventBus.emit && eventBus.emit('profile:updated', { userId: req.userId, profile: profile.toObject ? profile.toObject() : profile }) } catch (_){ }
    // Publish to Redis channel (best-effort) and Kafka
    try {
      const payload = { userId: req.userId, profile: profile.toObject ? profile.toObject() : profile }
      if (redisClient && typeof redisClient.publish === 'function') {
        try { await redisClient.publish('profiles:updates', JSON.stringify(payload)) } catch (rerr) { console.warn('Failed to publish profile update to Redis', rerr && rerr.message) }
      }
      try { await publishMessage(process.env.KAFKA_PROFILE_TOPIC || 'profile-updates', payload) } catch (kerr) { console.warn('Failed to publish profile update to Kafka', kerr && kerr.message) }
    } catch (_) {}
    return res.json({ profile })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
