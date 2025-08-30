import mongoose from 'mongoose'

const planSchema = new mongoose.Schema({
  name: { type: String, required: true },
  priceCents: { type: Number, required: true },
  currency: { type: String, default: 'usd' },
  interval: { type: String, enum: ['month','year'], default: 'month' },
  stripePriceId: { type: String },
  active: { type: Boolean, default: true },
}, { timestamps: true })

const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema)
export default Plan
