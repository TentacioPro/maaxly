import mongoose from 'mongoose'
import StudentProfile from '../models/StudentProfile.js'
import EmployerProfile from '../models/EmployerProfile.js'

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB || 'mvp-db'

async function list() {
  try {
    await mongoose.connect(mongoUri, { dbName })
    console.log(`Connected to ${mongoUri}/${dbName}`)
  const students = await StudentProfile.find().lean()
  console.log(`Found ${students.length} StudentProfile documents:`)
  console.dir(students, { depth: 4 })

  const employers = await EmployerProfile.find().lean()
  console.log(`Found ${employers.length} EmployerProfile documents:`)
  console.dir(employers, { depth: 4 })
    await mongoose.disconnect()
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

list()
