import express from 'express'
import jwt from 'jsonwebtoken'
import Redis from 'ioredis'
import redisClient from '../redis/client.js'

const router = express.Router()

// Server-Sent Events for messaging
// Client connects: GET /api/events/stream?userId=<id>
router.get('/stream', (req, res) => {
  // secure SSE with optional Authorization Bearer token; can also accept userId query for testing
  const auth = req.headers.authorization
  let userId = (req.query.userId || '').toString()

  // Support token passed as query param (used by browser EventSource clients)
  const tokenFromQuery = (req.query.token || '').toString()

  // Prefer Authorization header, fall back to token query, then userId query
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET || 'dev-secret')
      userId = payload.sub
    } catch (e) {
      return res.status(401).json({ message: 'Invalid token' })
    }
  } else if (tokenFromQuery) {
    try {
      const payload = jwt.verify(tokenFromQuery, process.env.JWT_SECRET || 'dev-secret')
      userId = payload.sub
    } catch (e) {
      return res.status(401).json({ message: 'Invalid token' })
    }
  }

  if (!userId) return res.status(400).json({ message: 'userId query or Bearer token required' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const send = (type, payload) => {
    res.write(`event: ${type}\n`)
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  // Subscribe to Redis channel for this user's inbox using a fresh ioredis subscriber
  const channel = `inbox:${userId}`
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  const sub = new Redis(redisUrl)
  // also subscribe to global profile updates channel so users can receive profile changes
  const profileChannel = 'profiles:updates'
  const analyticsChannel = `analytics:opportunity:${userId}`

  sub.subscribe(channel, profileChannel, analyticsChannel).then(() => {
    console.info(`[SSE] subscribed ${userId} -> ${channel}, ${profileChannel}, ${analyticsChannel}`)
  }).catch((err) => {
    console.error('Failed to subscribe to redis channels', err)
  })

  sub.on('message', (ch, message) => {
    try {
      const payload = JSON.parse(message)
      // If profile update channel, forward only when it pertains to this userId
      if (ch === profileChannel) {
        if (payload && payload.userId && String(payload.userId) === String(userId)) {
          send('profile', payload.profile || payload)
        }
        return
      }
      if (ch === analyticsChannel) {
        send('analytics', payload)
        return
      }
      console.info(`[SSE] publish -> ${ch}:`, payload && (payload.type || ''), payload && payload.message ? payload.message : payload)
      send(payload.type || 'message', payload.message || payload)
    } catch (e) {
      console.warn('Invalid message on channel', ch, e && e.message)
    }
  })
  const cleanup = () => {
    try {
      console.info(`[SSE] unsubscribed ${userId} -> ${channel}`)
      sub.unsubscribe(channel).catch(() => {})
      sub.quit().catch(() => {})
    } catch (e) {
      // ignore
    }
    try { res.end() } catch (e) {}
  }

  req.on('close', cleanup)
  req.on('error', cleanup)
})

export default router
