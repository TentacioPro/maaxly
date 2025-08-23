import mongoose from 'mongoose'

const employerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String },
  companyName: { type: String },
  companyWebsite: { type: String }
}, { timestamps: true })

const EmployerProfile = mongoose.models.EmployerProfile || mongoose.model('EmployerProfile', employerProfileSchema)

export default EmployerProfile
