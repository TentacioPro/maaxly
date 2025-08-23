import mongoose from 'mongoose'

const applicationSchema = new mongoose.Schema({
  opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coverLetter: { type: String },
}, { timestamps: true })

const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema)

export default Application
