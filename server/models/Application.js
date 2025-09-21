import mongoose from 'mongoose'

const applicationSchema = new mongoose.Schema({
  opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coverLetter: { type: String },
  status: { type: String, enum: ['applied','screening','interview','offer','rejected'], default: 'applied' },
  history: [{ status: String, at: { type: Date, default: Date.now } }]
}, { timestamps: true })

const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema)

export default Application
