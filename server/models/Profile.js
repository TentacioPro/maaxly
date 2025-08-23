import mongoose from 'mongoose'

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  fullName: { type: String },
  role: { type: String, enum: ['student', 'employer'], default: 'student' },
  bio: { type: String },
  // student-specific fields
  college: { type: String },
  graduationYear: { type: Number },
  major: { type: String },
  skills: { type: [String], default: [] }
  // employer-specific fields
  ,companyName: { type: String },
  companyWebsite: { type: String }
}, { timestamps: true })

const Profile = mongoose.models.Profile || mongoose.model('Profile', profileSchema)

export default Profile
