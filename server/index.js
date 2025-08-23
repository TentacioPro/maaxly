import express from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import User from './models/User.js'
import StudentProfile from './models/StudentProfile.js'
import EmployerProfile from './models/EmployerProfile.js'
import Opportunity from './models/Opportunity.js'

const app = express()
const port = process.env.PORT || 4000
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB || 'mvp-db'

app.use(express.json())
// Enable CORS for the frontend during development
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin: corsOrigin }))

app.get('/', (req, res) => {
  res.json({ message: 'Server is running' })
})

// Test route for health + db ping
app.get('/api/test', async (req, res) => {
  try {
    const admin = mongoose.connection.db.admin()
    await admin.ping()
    res.json({ success: true, message: 'API test OK', database: dbName })
  } catch (err) {
    res.status(500).json({ success: false, message: 'API test failed', error: err.message })
  }
})

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' })

    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ message: 'Email already in use' })

    const saltRounds = 10
    const hashed = await bcrypt.hash(password, saltRounds)

    const user = new User({ email, password: hashed })
    await user.save()

    // Do not return password in response
  const userObj = user.toObject()
  delete userObj.password

  // sign a token
  const token = jwt.sign({ sub: user._id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' })

  res.status(201).json({ success: true, user: userObj, token })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' })

    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ message: 'Invalid credentials' })

    const userObj = user.toObject()
    delete userObj.password

    const token = jwt.sign({ sub: user._id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' })

    res.json({ success: true, user: userObj, token })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' })
  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    req.userId = payload.sub
    return next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

// Legacy profile endpoint removed; use /api/profile/student or /api/profile/employer

// Create or update student profile (protected)
app.post('/api/profile/student', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const { fullName, college, graduationYear, major, skills } = req.body

    // create or update student profile in its own collection
    const update = {
      fullName,
      college,
      graduationYear: graduationYear ? Number(graduationYear) : undefined,
      major,
      skills: Array.isArray(skills) ? skills : []
    }

  // create a new student profile document (do not overwrite existing ones)
  const profileDoc = new StudentProfile({ userId, ...update })
  await profileDoc.save()

  // mark user as completed onboarding
  await User.findByIdAndUpdate(userId, { hasCompletedOnboarding: true })

  res.status(201).json({ success: true, profile: profileDoc })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Create or update employer profile (protected)
app.post('/api/profile/employer', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const { fullName, companyName, companyWebsite } = req.body

    const update = {
      fullName,
      companyName,
      companyWebsite
    }

  // create new employer profile document
  const profileDoc = new EmployerProfile({ userId, ...update })
  await profileDoc.save()

  // mark user as completed onboarding
  await User.findByIdAndUpdate(userId, { hasCompletedOnboarding: true })

  res.status(201).json({ success: true, profile: profileDoc })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Onboarding role selection - protected
app.post('/api/onboarding/role', authMiddleware, async (req, res) => {
  try {
    const { userId, role } = req.body
    // basic validation
    if (!userId || !role) return res.status(400).json({ message: 'userId and role are required' })
    if (!['student', 'employer'].includes(role)) return res.status(400).json({ message: 'Invalid role' })

    // ensure authenticated user matches the provided userId
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' })
    if (req.userId !== userId) return res.status(403).json({ message: 'Forbidden: userId does not match token' })

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true })
    if (!user) return res.status(404).json({ message: 'User not found' })

    res.json({ success: true, user })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Get current user's profile (student or employer)
app.get('/api/profile/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    // prefer StudentProfile then EmployerProfile
    let profile = await StudentProfile.findOne({ userId }).lean()
    if (profile) return res.json({ success: true, profile, type: 'student' })

    profile = await EmployerProfile.findOne({ userId }).lean()
    if (profile) return res.json({ success: true, profile, type: 'employer' })

    return res.status(404).json({ success: false, message: 'Profile not found' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Opportunities routes
app.get('/api/opportunities', async (req, res) => {
  try {
    const items = await Opportunity.find().sort({ createdAt: -1 }).lean()
    res.json({ success: true, opportunities: items })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

app.post('/api/opportunities', async (req, res) => {
  try {
    const { title, description, type } = req.body
    if (!title || !type) return res.status(400).json({ message: 'title and type are required' })
    const opp = new Opportunity({ title, description, type })
    await opp.save()
    res.status(201).json({ success: true, opportunity: opp })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

async function startServer() {
  try {
  // Use modern mongoose connect signature; pass dbName to avoid deprecated driver options
  await mongoose.connect(mongoUri, { dbName })
    console.log(`Connected to MongoDB at ${mongoUri}, using database '${dbName}'`)

    // Ensure a minimal collection exists
    try {
      const collections = await mongoose.connection.db.listCollections({ name: 'init_collection' }).toArray()
      if (collections.length === 0) {
        await mongoose.connection.db.collection('init_collection').insertOne({ initializedAt: new Date(), note: 'db init document' })
        console.log('Initialized database with collection "init_collection"')
      } else {
        console.log('Initialization collection already exists')
      }
    } catch (initErr) {
      console.warn('Database initialization step failed:', initErr.message)
    }

    // Defensive: drop unique indexes on profile userId fields if they exist (to allow multiple profiles per user)
    try {
      const collNames = await mongoose.connection.db.listCollections().toArray()
      const names = collNames.map(c => c.name)
      if (names.includes('studentprofiles')) {
        try {
          await mongoose.connection.db.collection('studentprofiles').dropIndex('userId_1')
          console.log('Dropped studentprofiles.userId_1 index')
        } catch (e) {
          /* ignore */
        }
      }
      if (names.includes('employerprofiles')) {
        try {
          await mongoose.connection.db.collection('employerprofiles').dropIndex('userId_1')
          console.log('Dropped employerprofiles.userId_1 index')
        } catch (e) {
          /* ignore */
        }
      }
    } catch (ixErr) {
      console.warn('Index cleanup skipped:', ixErr.message)
    }

    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

startServer()

export default app
