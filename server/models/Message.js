import mongoose from 'mongoose'

const { Schema } = mongoose

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    attachments: [
      {
        type: {
          type: String,
          enum: ['image', 'file', 'link'],
          default: 'file'
        },
        url: String,
        name: String,
        size: Number
      }
    ],
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
)

messageSchema.index({ conversation: 1, createdAt: -1 })

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema)

export default Message
