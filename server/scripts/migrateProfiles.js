import mongoose from 'mongoose'
import Profile from '../models/Profile.js'
import StudentProfile from '../models/StudentProfile.js'
import EmployerProfile from '../models/EmployerProfile.js'
import User from '../models/User.js'

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB || 'mvp-db'

async function migrate() {
  try {
    await mongoose.connect(mongoUri, { dbName })
    console.log(`Connected to ${mongoUri}/${dbName}`)

    const legacy = await Profile.find().lean()
    console.log(`Found ${legacy.length} legacy profiles to migrate`)

    for (const p of legacy) {
      const userId = p.userId
      if (!userId) continue

      if (p.role === 'student') {
        const update = {
          fullName: p.fullName,
          college: p.college,
          graduationYear: p.graduationYear,
          major: p.major,
          skills: Array.isArray(p.skills) ? p.skills : []
        }
        await StudentProfile.findOneAndUpdate({ userId }, update, { upsert: true, new: true, setDefaultsOnInsert: true })
        await User.findByIdAndUpdate(userId, { hasCompletedOnboarding: true })
        console.log(`Migrated student profile for user ${userId}`)
      } else if (p.role === 'employer') {
        const update = {
          fullName: p.fullName,
          companyName: p.companyName,
          companyWebsite: p.companyWebsite
        }
        await EmployerProfile.findOneAndUpdate({ userId }, update, { upsert: true, new: true, setDefaultsOnInsert: true })
        await User.findByIdAndUpdate(userId, { hasCompletedOnboarding: true })
        console.log(`Migrated employer profile for user ${userId}`)
      } else {
        console.log(`Skipping profile with unknown role for user ${userId}`)
      }
    }

    console.log('Migration finished')
    await mongoose.disconnect()
  } catch (err) {
    console.error('Migration error:', err)
    process.exit(1)
  }
}

migrate()
