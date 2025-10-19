import { Kafka } from 'kafkajs'
import Message from '../models/Message.js'
import Conversation from '../models/Conversation.js'
import redisClient from '../redis/client.js'

const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || 'localhost:9092')
  .split(',')
  .map(b => b.trim())
  .filter(Boolean)

const kafka = new Kafka({ brokers })
const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'chat-consumer-group' })

export async function startConsumer() {
  await consumer.connect()
  await consumer.subscribe({ topic: process.env.KAFKA_TOPIC || 'chat-messages', fromBeginning: false })

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const payload = JSON.parse(message.value.toString())
        const now = new Date()
        // If producer (future step) sets messageId use it for idempotency
        let msgDoc
        if (payload.messageId) {
          msgDoc = await Message.findOne({ _id: payload.messageId })
          if (!msgDoc) {
            msgDoc = new Message({
              _id: payload.messageId,
              conversation: payload.conversationId,
              sender: payload.sender,
              text: payload.text || '',
              attachments: payload.attachments || []
            })
            await msgDoc.save()
          }
        } else {
          msgDoc = new Message({
            conversation: payload.conversationId,
            sender: payload.sender,
            text: payload.text || '',
            attachments: payload.attachments || []
          })
          await msgDoc.save()
        }

        await Conversation.findByIdAndUpdate(payload.conversationId, { lastMessage: msgDoc._id, updatedAt: now })

        const participants = payload.participants || []
        for (const uid of participants) {
          if (String(uid) === String(payload.sender)) continue
          const key = `messages:${uid}`
          await redisClient.lpush(key, JSON.stringify({ messageId: String(msgDoc._id), conversationId: payload.conversationId, sender: payload.sender, text: payload.text, ts: msgDoc.createdAt }))
          await redisClient.hincrby(`unread:${uid}`, payload.conversationId, 1)
          await redisClient.publish(`inbox:${uid}`, JSON.stringify({ type: 'message', message: { messageId: String(msgDoc._id), conversationId: payload.conversationId, sender: payload.sender, text: payload.text, ts: msgDoc.createdAt } }))
        }
      } catch (err) {
        console.error('Consumer failed processing message:', err)
      }
    }
  })
}

export default consumer

// Helper to reset unread count for a conversation
export async function resetUnreadCount(userId, conversationId) {
  try {
    await redisClient.hdel(`unread:${userId}`, conversationId)
  } catch (err) {
    console.error('Failed to reset unread count:', err)
  }
}
