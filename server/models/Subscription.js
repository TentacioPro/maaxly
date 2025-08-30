import mongoose from 'mongoose'

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  status: { type: String, enum: ['active','past_due','canceled','incomplete'], default: 'incomplete' },
  currentPeriodStart: { type: Date },
  currentPeriodEnd: { type: Date },
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
}, { timestamps: true })

const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema)
export default Subscription
