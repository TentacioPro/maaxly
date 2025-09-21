import mongoose from 'mongoose'

const { Schema } = mongoose

const conversationSchema = new Schema(
  {
    participants: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        lastSeenMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
        lastSeenAt: { type: Date }
      }
    ],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' }
  },
  { timestamps: true }
)

// helpful compound indexes
conversationSchema.index({ updatedAt: -1 })
conversationSchema.index({ 'participants.user': 1 })

const Conversation =
  mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema)

export default Conversation
