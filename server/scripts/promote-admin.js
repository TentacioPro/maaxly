import mongoose from 'mongoose'
import User from './models/User.js'
import AdminProfile from './models/AdminProfile.js'
import StudentProfile from './models/StudentProfile.js'
import EmployerProfile from './models/EmployerProfile.js'

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB || 'mvp-db'

async function promote(email) {
  if (!email) {
    console.error('Usage: node server/promote-admin.js user@example.com')
    process.exit(1)
  }

  try {
    await mongoose.connect(mongoUri, { dbName })
    console.log(`Connected to MongoDB at ${mongoUri} (db: ${dbName})`)

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      console.error('User not found:', email)
      process.exit(2)
    }

  user.isAdmin = true
  user.role = 'admin'
  user.isStudent = false
  user.isEmployer = false
  await user.save()
    console.log('User promoted to admin:', user.email)

    // Create a default AdminProfile if one does not exist
    const existing = await AdminProfile.findOne({ userId: user._id })
    if (!existing) {
      const displayName = user.email.split('@')[0]
      const adminProfile = new AdminProfile({ userId: user._id, displayName, title: 'Administrator' })
      await adminProfile.save()
      console.log('Created AdminProfile for:', user.email)
    } else {
      console.log('AdminProfile already exists for:', user.email)
    }

    // Remove any existing student/employer profiles to keep data consistent
    const removedStudent = await StudentProfile.deleteMany({ userId: user._id })
    const removedEmployer = await EmployerProfile.deleteMany({ userId: user._id })
    if (removedStudent.deletedCount) console.log('Removed student profiles:', removedStudent.deletedCount)
    if (removedEmployer.deletedCount) console.log('Removed employer profiles:', removedEmployer.deletedCount)
    process.exit(0)
  } catch (err) {
    console.error('Error promoting user:', err.message)
    process.exit(3)
  }
}

const emailArg = process.argv[2]
promote(emailArg)
