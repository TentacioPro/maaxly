import mongoose from 'mongoose'

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB || 'mvp-db'

async function run() {
  try {
    await mongoose.connect(mongoUri, { dbName })
    console.log(`Connected to MongoDB at ${mongoUri}, db '${dbName}'`)
    await mongoose.connection.dropDatabase()
    console.log(`Dropped database '${dbName}'`)
    await mongoose.disconnect()
    console.log('Disconnected.')
    process.exit(0)
  } catch (err) {
    console.error('DB reset failed:', err && err.message)
    process.exit(1)
  }
}

run()
