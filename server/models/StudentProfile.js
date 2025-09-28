import mongoose from 'mongoose'
import { experienceSchema } from './Experience.js'
import { educationSchema } from './Education.js'

const studentProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, trim: true, default: '' },
  username: { type: String, required: true, unique: true, trim: true, lowercase: true, match: [/^[a-z0-9-]+$/, 'invalid username'] },
  publicId: { type: String, unique: true, index: true },
  profilePictureUrl: { type: String, trim: true, default: '' },
  location: { type: String, trim: true, default: '' },
  headline: { type: String, trim: true, default: '' },
  bio: { type: String, trim: true, default: '' },
  links: {
    portfolio: { type: String, trim: true, default: '' },
    github: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' }
  },
  college: { type: String, trim: true, default: '' },
  graduationYear: { type: Number },
  major: { type: String, trim: true, default: '' },
  skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
  experience: [experienceSchema],
  education: [educationSchema],
  preferences: {
    jobSearchStatus: { type: String, enum: ['NOT_LOOKING', 'OPEN_TO_OPPORTUNITIES', 'ACTIVELY_APPLYING'], default: 'NOT_LOOKING' },
    primaryRole: { type: String, trim: true, default: '' },
    openToRoles: [{ type: String, trim: true }],
    salaryExpectation: { type: Number }
  },
  visibility: { type: String, enum: ['PUBLIC', 'UNLISTED', 'PRIVATE'], default: 'PUBLIC' },
  // Persistent resume storage (GridFS metadata)
  resumeFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'resumes.files' },
  resumeFilename: { type: String },
  resumeContentType: { type: String },
  resumeUploadedAt: { type: Date }
  ,
  // Avatar (profile photo) in GridFS
  avatarFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'avatars.files' },
  avatarFilename: { type: String },
  avatarContentType: { type: String },
  avatarUploadedAt: { type: Date }
}, { timestamps: true })

// Generate a URL-safe publicId if missing
function makePublicId() {
  // Short, URL-safe id: base36 timestamp + random block
  const ts = Date.now().toString(36)
  const rnd = Math.random().toString(36).slice(2, 8)
  return `${ts}${rnd}`
}

studentProfileSchema.pre('save', function(next) {
  if (!this.publicId) this.publicId = makePublicId()
  next()
})

const StudentProfile = mongoose.models.StudentProfile || mongoose.model('StudentProfile', studentProfileSchema)

export default StudentProfile
