import mongoose from 'mongoose'

const adminProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  displayName: { type: String },
  title: { type: String },
  phone: { type: String },
  avatarUrl: { type: String },
  permissions: { type: [String], default: [] },
  notes: { type: String }
}, { timestamps: true })

const AdminProfile = mongoose.models.AdminProfile || mongoose.model('AdminProfile', adminProfileSchema)

export default AdminProfile
