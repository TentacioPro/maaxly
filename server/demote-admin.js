import mongoose from 'mongoose'
import User from './models/User.js'
import AdminProfile from './models/AdminProfile.js'

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB || 'mvp-db'

async function demote(email, newRole = 'student') {
  if (!email) {
    console.error('Usage: node server/demote-admin.js user@example.com [student|employer]')
    process.exit(1)
  }
  if (!['student','employer'].includes(newRole)) {
    console.error('newRole must be student or employer')
    process.exit(1)
  }
  try {
    await mongoose.connect(mongoUri, { dbName })
    console.log(`Connected to MongoDB at ${mongoUri} (db: ${dbName})`)

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) { console.error('User not found'); process.exit(2) }

    user.isAdmin = false
    user.role = newRole
    user.isStudent = newRole === 'student'
    user.isEmployer = newRole === 'employer'
    await user.save()
    console.log('User demoted from admin:', user.email)

    // remove admin profile when demoted
    const removed = await AdminProfile.deleteMany({ userId: user._id })
    if (removed.deletedCount) console.log('Removed AdminProfile:', removed.deletedCount)

    process.exit(0)
  } catch (err) {
    console.error('Error demoting admin:', err.message)
    process.exit(3)
  }
}

const emailArg = process.argv[2]
const roleArg = process.argv[3]
demote(emailArg, roleArg)
