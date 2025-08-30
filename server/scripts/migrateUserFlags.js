import mongoose from 'mongoose'
import User from '../models/User.js'

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB || 'mvp-db'

async function run() {
  await mongoose.connect(mongoUri, { dbName })
  console.log('Connected for migration')

  const users = await User.find().lean()
  let updated = 0
  for (const u of users) {
    const isStudent = u.role === 'student' || !!u.isStudent
    const isEmployer = u.role === 'employer' || !!u.isEmployer
    const isAdmin = !!u.isAdmin && u.role === 'admin' // only keep isAdmin if role is admin

    const changes = {}
    if (isStudent !== u.isStudent) changes.isStudent = isStudent
    if (isEmployer !== u.isEmployer) changes.isEmployer = isEmployer
    if (isAdmin !== u.isAdmin) changes.isAdmin = isAdmin

    if (Object.keys(changes).length) {
      await User.updateOne({ _id: u._id }, { $set: changes })
      updated++
    }
  }

  console.log(`Migration complete. Users updated: ${updated}`)
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
