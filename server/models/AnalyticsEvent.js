import mongoose from 'mongoose'

const analyticsEventSchema = new mongoose.Schema({
  path: { type: String, required: true },
  role: { type: String, enum: ['guest','student','employer','admin'], default: 'guest' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referrer: { type: String },
  ua: { type: String },
  ts: { type: Date, default: () => new Date() },
}, { timestamps: false, versionKey: false })

analyticsEventSchema.index({ ts: -1 })
analyticsEventSchema.index({ path: 1, ts: -1 })
analyticsEventSchema.index({ role: 1, ts: -1 })

const AnalyticsEvent = mongoose.models.AnalyticsEvent || mongoose.model('AnalyticsEvent', analyticsEventSchema)
export default AnalyticsEvent
