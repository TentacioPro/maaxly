// Docker-aware wrapper for seeding core data.
// Decides Mongo host automatically:
// - If MONGODB_HOST provided (e.g. 'mongodb' inside compose network) use that.
// - Else fall back to localhost (host machine talking to mapped port).
// Builds an auth URI using root creds unless MONGODB_URI already supplied.

const user = process.env.MONGO_INITDB_ROOT_USERNAME || 'maaxly'
const pass = process.env.MONGO_INITDB_ROOT_PASSWORD || 'maaxlypass'
const db = process.env.MONGODB_DB || 'mvp-db'
const host = process.env.MONGODB_HOST || 'localhost'

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = `mongodb://${user}:${pass}@${host}:27017/${db}?authSource=admin`
  console.log('[seed-docker] Using constructed MONGODB_URI:', process.env.MONGODB_URI)
} else {
  console.log('[seed-docker] Using existing MONGODB_URI:', process.env.MONGODB_URI)
}

// Dynamically import original seed script (which executes at top-level)
import('./seed.js').catch(err => {
  console.error('[seed-docker] Seed failed:', err)
  process.exit(1)
})
