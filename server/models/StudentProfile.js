import mongoose from 'mongoose'

const studentProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String },
  college: { type: String },
  graduationYear: { type: Number },
  major: { type: String },
  skills: { type: [String], default: [] }
}, { timestamps: true })

const StudentProfile = mongoose.models.StudentProfile || mongoose.model('StudentProfile', studentProfileSchema)

export default StudentProfile
