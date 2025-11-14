import express from 'express'
import mongoose from 'mongoose'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import User from '../models/User.js'
import bus from '../lib/event-bus.js'
import { publishMessage, KAFKA_ENABLED } from '../kafka/producer.js'
import redisClient from '../redis/client.js'

// This file expects authMiddleware to be passed in when mounting
const router = express.Router()

// utils
function toObjectId(id) {
  try {
    return new mongoose.Types.ObjectId(id)
  } catch (e) {
    return null
  }
}

// GET /api/messages -> list conversations for current user
router.get('/', async (req, res) => {
  try {
    const me = req.userId
    const items = await Conversation.find({ 'participants.user': me })
      .sort({ updatedAt: -1 })
      .populate({ path: 'participants.user', select: 'email role isEmployer isStudent' })
      .populate({ path: 'lastMessage', select: 'sender text createdAt', populate: { path: 'sender', select: 'email' } })
      .lean()

    res.json({ success: true, conversations: items })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/messages/history?conversationId=...&limit=50&before=<ISO|messageId>
// Returns ordered (oldest -> newest) messages plus cursor metadata
router.get('/history', async (req, res) => {
  try {
    const me = req.userId
    const { conversationId, limit = 50, before } = req.query
    if (!conversationId) return res.status(400).json({ success: false, message: 'conversationId required' })

    const conv = await Conversation.findById(conversationId).select('participants')
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' })
    const isParticipant = conv.participants.some(p => String(p.user) === String(me))
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Forbidden' })

    const pageSize = Math.min(parseInt(limit, 10) || 50, 200)
    const query = { conversation: conversationId }
    if (before) {
      // Accept ISO date first; fallback to messageId lookup
      const date = new Date(before)
      if (!isNaN(date.getTime())) {
        query.createdAt = { $lt: date }
      } else if (/^[0-9a-fA-F]{24}$/.test(before)) {
        const cursorMsg = await Message.findById(before).select('createdAt').lean()
        if (cursorMsg) query.createdAt = { $lt: cursorMsg.createdAt }
      }
    }

    const docs = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .populate('sender', 'email')
      .lean()

    const messages = docs.slice().reverse()
    const hasMore = docs.length === pageSize
    const nextCursor = hasMore && messages.length > 0 ? messages[0].createdAt.toISOString() : null

    res.json({ success: true, messages, hasMore, nextCursor })
  } catch (err) {
    console.error('Error fetching history', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/messages/:conversationId -> paginated history
router.get('/:conversationId', async (req, res) => {
  try {
    const me = req.userId
    const { conversationId } = req.params
    const conv = await Conversation.findById(conversationId)
    if (!conv) return res.status(404).json({ message: 'Conversation not found' })
    const isParticipant = conv.participants.some(p => String(p.user) === String(me))
    if (!isParticipant) return res.status(403).json({ message: 'Forbidden' })

    const limit = Math.min(parseInt(req.query.limit || '30', 10), 100)
    const cursor = req.query.before
    const query = { conversation: conversationId }
    if (cursor) {
      const beforeDate = new Date(cursor)
      if (!isNaN(beforeDate.getTime())) query.createdAt = { $lt: beforeDate }
    }

    const msgs = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'email')
      .lean()

    res.json({ success: true, messages: msgs })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/messages/new -> start conversation
router.post('/new', async (req, res) => {
  try {
    const me = req.userId
    const { participantId } = req.body
    const other = toObjectId(participantId)
    if (!other) return res.status(400).json({ message: 'participantId required' })
    if (String(other) === String(me)) return res.status(400).json({ message: 'Cannot start conversation with yourself' })

    // ensure both users exist
    const [u1, u2] = await Promise.all([
      User.findById(me).select('_id'),
      User.findById(other).select('_id')
    ])
    if (!u1 || !u2) return res.status(404).json({ message: 'User not found' })

    // find existing or create
    // find existing conversation between the two users (exactly 2 participants)
    const existing = await Conversation.findOne({
      $and: [
        { 'participants.user': { $all: [me, other] } },
        { participants: { $size: 2 } }
      ]
    })
    if (existing) return res.json({ success: true, conversation: existing })

  const conv = new Conversation({ participants: [{ user: me }, { user: other }] })
  await conv.save()
  // emit creation event for future realtime consumers
  bus.emit('conversation:created', { conversationId: String(conv._id), participants: conv.participants.map(p => String(p.user)) })
  res.status(201).json({ success: true, conversation: conv })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/messages -> send message (produce to Kafka)
router.post('/', async (req, res) => {
  try {
    const me = req.userId
    const { conversationId, text, attachments } = req.body
    if (!conversationId) return res.status(400).json({ message: 'conversationId required' })

    const conv = await Conversation.findById(conversationId)
    if (!conv) return res.status(404).json({ message: 'Conversation not found' })
    const isParticipant = conv.participants.some(p => String(p.user) === String(me))
    if (!isParticipant) return res.status(403).json({ message: 'Forbidden' })

    // Pre-generate messageId for idempotency & optimistic UI
    const messageId = new mongoose.Types.ObjectId()
    const payload = {
      messageId: String(messageId),
      conversationId: String(conversationId),
      sender: String(me),
      text: text || '',
      attachments: Array.isArray(attachments) ? attachments : [],
      participants: conv.participants.map(p => String(p.user))
    }

    if (!KAFKA_ENABLED) {
      // Kafka disabled: persist directly to MongoDB and notify via Redis asynchronously
      const msg = new Message({ _id: messageId, conversation: conversationId, sender: me, text: text || '', attachments: Array.isArray(attachments) ? attachments : [] })
      await msg.save()
      conv.lastMessage = msg._id
      await conv.save()
      const populated = await msg.populate('sender', 'email')

      // Fire-and-forget Redis notifications and local event emit so response isn't delayed by Redis
      ;(async () => {
        try {
          for (const uid of conv.participants.map(p => String(p.user))) {
            if (String(uid) === String(me)) continue // do not notify sender
            try {
              await redisClient.lpush(`messages:${uid}`, JSON.stringify({ messageId: String(msg._id), conversationId: String(conversationId), sender: String(me), text: msg.text, ts: msg.createdAt }))
            } catch (e) { console.warn('Redis LPUSH failed for messages list', e && e.message) }
            try {
              await redisClient.hincrby(`unread:${uid}`, String(conversationId), 1)
            } catch (e) { console.warn('Redis HINCRBY failed for unread counter', e && e.message) }
            try {
              await redisClient.publish(`inbox:${uid}`, JSON.stringify({ type: 'message', message: { messageId: String(msg._id), conversationId: String(conversationId), sender: String(me), text: msg.text, ts: msg.createdAt } }))
            } catch (e) { console.warn('Redis PUBLISH failed for inbox channel', e && e.message) }
          }
          try { bus.emit('message:created', { conversationId: String(conv._id), messageId: String(msg._id), sender: String(me), participants: conv.participants.map(p => String(p.user)) }) } catch (e) { console.warn('bus.emit failed', e && e.message) }
        } catch (outer) {
          console.warn('Async notify failed', outer && outer.message)
        }
      })()

      return res.status(201).json({ success: true, message: populated })
    }

    try {
      await publishMessage(process.env.KAFKA_TOPIC || 'chat-messages', payload)
    } catch (kerr) {
      console.warn('Failed to publish to Kafka, falling back to Mongo write', kerr && kerr.message)
      // fallback: write directly and notify asynchronously
      const msg = new Message({ _id: messageId, conversation: conversationId, sender: me, text: text || '', attachments: Array.isArray(attachments) ? attachments : [] })
      await msg.save()
      conv.lastMessage = msg._id
      await conv.save()
      const populated = await msg.populate('sender', 'email')

      // Async notify
      ;(async () => {
        try {
          for (const uid of conv.participants.map(p => String(p.user))) {
            if (String(uid) === String(me)) continue
            try { await redisClient.lpush(`messages:${uid}`, JSON.stringify({ messageId: String(msg._id), conversationId: String(conversationId), sender: String(me), text: msg.text, ts: msg.createdAt })) } catch (e) { console.warn('Redis LPUSH failed in fallback', e && e.message) }
            try { await redisClient.hincrby(`unread:${uid}`, String(conversationId), 1) } catch (e) { console.warn('Redis HINCRBY failed in fallback', e && e.message) }
            try { await redisClient.publish(`inbox:${uid}`, JSON.stringify({ type: 'message', message: { messageId: String(msg._id), conversationId: String(conversationId), sender: String(me), text: msg.text, ts: msg.createdAt } })) } catch (e) { console.warn('Redis PUBLISH failed in fallback', e && e.message) }
          }
          try { bus.emit('message:created', { conversationId: String(conv._id), messageId: String(msg._id), sender: String(me), participants: conv.participants.map(p => String(p.user)) }) } catch (e) { console.warn('bus.emit failed in fallback', e && e.message) }
        } catch (outer) { console.warn('Async notify failed in fallback', outer && outer.message) }
      })()

      return res.status(201).json({ success: true, message: populated })
    }

    // optimistic response: the consumer will persist & push to redis
    res.status(202).json({ success: true, queued: true, messageId: String(messageId) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PATCH /api/messages/:id/read -> mark as read
router.patch('/:id/read', async (req, res) => {
  try {
    const me = req.userId
    const { id } = req.params
    const msg = await Message.findById(id)
    if (!msg) return res.status(404).json({ message: 'Message not found' })

    // ensure membership
    const conv = await Conversation.findById(msg.conversation)
    const isParticipant = conv && conv.participants.some(p => String(p.user) === String(me))
    if (!isParticipant) return res.status(403).json({ message: 'Forbidden' })

    if (!msg.readBy.some(u => String(u) === String(me))) {
      msg.readBy.push(me)
      await msg.save()
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/messages/:conversationId/ack -> acknowledge messages up to lastSeenMessageId
router.post('/:conversationId/ack', async (req, res) => {
  try {
    const me = req.userId
    const { conversationId } = req.params
    const { lastSeenMessageId } = req.body
    if (!lastSeenMessageId) return res.status(400).json({ message: 'lastSeenMessageId required' })

    const conv = await Conversation.findById(conversationId)
    if (!conv) return res.status(404).json({ message: 'Conversation not found' })
    const isParticipant = conv.participants.some(p => String(p.user) === String(me))
    if (!isParticipant) return res.status(403).json({ message: 'Forbidden' })

    const lastSeenAt = new Date()

    // Update conversation-level lastSeen
    const participantIndex = conv.participants.findIndex(p => String(p.user) === String(me))
    if (participantIndex !== -1) {
      conv.participants[participantIndex].lastSeenMessageId = lastSeenMessageId
      conv.participants[participantIndex].lastSeenAt = lastSeenAt
      await conv.save()
    }

    // Message-level update: mark all messages up to lastSeenMessageId as read by me
    await Message.updateMany(
      { conversation: conversationId, _id: { $lte: lastSeenMessageId }, readBy: { $ne: me } },
      { $push: { readBy: me } }
    )

    // Redis updates
    try {
      await redisClient.hdel(`unread:${me}`, conversationId)
      await redisClient.publish(`inbox:${me}`, JSON.stringify({
        type: 'ack',
        message: { conversationId, userId: me, lastSeenMessageId, timestamp: lastSeenAt }
      }))
    } catch (redisErr) {
      console.warn('Redis update failed in ack:', redisErr.message)
    }

    res.json({ success: true, conversationId, lastSeenMessageId, lastSeenAt })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// placeholder search route removed; see server/routes/search.js

export default router
