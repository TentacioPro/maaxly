// Docker-aware wrapper for seeding skills only.
const user = process.env.MONGO_INITDB_ROOT_USERNAME || 'maaxly'
const pass = process.env.MONGO_INITDB_ROOT_PASSWORD || 'maaxlypass'
const db = process.env.MONGODB_DB || 'mvp-db'
const host = process.env.MONGODB_HOST || 'localhost'

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = `mongodb://${user}:${pass}@${host}:27017/${db}?authSource=admin`
  console.log('[seedSkills-docker] Using constructed MONGODB_URI:', process.env.MONGODB_URI)
} else {
  console.log('[seedSkills-docker] Using existing MONGODB_URI:', process.env.MONGODB_URI)
}

import('./seedSkills.js').catch(err => {
  console.error('[seedSkills-docker] Seed failed:', err)
  process.exit(1)
})
