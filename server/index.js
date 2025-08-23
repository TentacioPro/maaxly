import express from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import User from './models/User.js'
import StudentProfile from './models/StudentProfile.js'
import EmployerProfile from './models/EmployerProfile.js'
import Opportunity from './models/Opportunity.js'
import Application from './models/Application.js'
import AdminProfile from './models/AdminProfile.js'

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
  // debug: log the raw Authorization header (helps diagnose PowerShell/curl header formatting issues)
  console.log('[authMiddleware] Authorization header:', auth)
  if (!auth || !auth.startsWith('Bearer ')) {
    console.warn('[authMiddleware] Missing or malformed Authorization header')
    return res.status(401).json({ message: 'Missing token' })
  }
  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    req.userId = payload.sub
    return next()
  } catch (err) {
    console.error('[authMiddleware] Invalid token:', err && err.message)
    return res.status(401).json({ message: 'Invalid token' })
  }
}

// adminRequired middleware: ensures user is authenticated and isAdmin === true
function adminRequired(req, res, next) {
  // reuse authMiddleware to validate token and set req.userId
  authMiddleware(req, res, async () => {
    try {
      const requester = await User.findById(req.userId)
      if (!requester) return res.status(401).json({ message: 'Unauthorized' })
      if (!requester.isAdmin) return res.status(403).json({ message: 'Forbidden: admin only' })
      return next()
    } catch (err) {
      console.error('[adminRequired] error:', err && err.message)
      return res.status(500).json({ message: 'Server error' })
    }
  })
}

// Legacy profile endpoint removed; use /api/profile/student or /api/profile/employer

// Create or update student profile (protected)
async function handleCreateStudentProfile(req, res) {
  try {
    const targetUserId = req.params.userId || req.userId
    if (!targetUserId) return res.status(401).json({ message: 'Unauthorized' })
    if (req.userId !== targetUserId) return res.status(403).json({ message: 'Forbidden: userId does not match token' })

    const { fullName, college, graduationYear, major, skills } = req.body

    const update = {
      fullName,
      college,
      graduationYear: graduationYear ? Number(graduationYear) : undefined,
      major,
      skills: Array.isArray(skills) ? skills : []
    }

    const profileDoc = new StudentProfile({ userId: targetUserId, ...update })
    await profileDoc.save()

    await User.findByIdAndUpdate(targetUserId, { hasCompletedOnboarding: true })

    res.status(201).json({ success: true, profile: profileDoc })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

app.post('/api/profile/student', authMiddleware, handleCreateStudentProfile)
app.post('/api/profile/student/:userId', authMiddleware, handleCreateStudentProfile)

// Create or update employer profile (protected)
async function handleCreateEmployerProfile(req, res) {
  try {
    const targetUserId = req.params.userId || req.userId
    if (!targetUserId) return res.status(401).json({ message: 'Unauthorized' })
    if (req.userId !== targetUserId) return res.status(403).json({ message: 'Forbidden: userId does not match token' })

    const { fullName, companyName, companyWebsite } = req.body

    const update = {
      fullName,
      companyName,
      companyWebsite
    }

    const profileDoc = new EmployerProfile({ userId: targetUserId, ...update })
    await profileDoc.save()

    await User.findByIdAndUpdate(targetUserId, { hasCompletedOnboarding: true })

    res.status(201).json({ success: true, profile: profileDoc })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

app.post('/api/profile/employer', authMiddleware, handleCreateEmployerProfile)
app.post('/api/profile/employer/:userId', authMiddleware, handleCreateEmployerProfile)

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

// Get opportunities owned by the authenticated employer
app.get('/api/opportunities/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    const items = await Opportunity.find({ owner: userId }).sort({ createdAt: -1 }).lean()
    res.json({ success: true, opportunities: items })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Add protected endpoint to return only opportunities created by the currently logged-in employer
app.get('/api/opportunities/my-listings', authMiddleware, async (req, res) => {
  try {
    // Find opportunities where the owner matches the authenticated user's id
    const myListings = await Opportunity.find({ owner: req.userId }).sort({ createdAt: -1 });
    return res.json(myListings);
  } catch (err) {
    console.error('Error fetching my listings:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Replace public creation with protected employer-only creation
app.post('/api/opportunities', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const user = await User.findById(userId)
    if (!user) return res.status(401).json({ message: 'Unauthorized' })
    if (user.role !== 'employer') return res.status(403).json({ message: 'Forbidden: only employers can create opportunities' })

    const { title, description, type } = req.body
    if (!title || !type) return res.status(400).json({ message: 'title and type are required' })

    const oppData = { title, description, type, owner: userId }

    const opp = new Opportunity(oppData)
    await opp.save()
    res.status(201).json({ success: true, opportunity: opp })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET single opportunity by id (public)
app.get('/api/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params
    const opp = await Opportunity.findById(id).lean()
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' })
    res.json({ success: true, opportunity: opp })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET applicants for an opportunity (protected, only owner or admin)
app.get('/api/opportunities/:id/applicants', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const opp = await Opportunity.findById(id)
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' })

    // only the opportunity owner or admin can see applicants
    const requester = await User.findById(req.userId)
    if (!requester) return res.status(401).json({ message: 'Unauthorized' })
    if (String(opp.owner) !== String(req.userId) && requester.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const applications = await Application.find({ opportunity: id }).populate('applicant', 'email').lean()
    res.json({ success: true, applicants: applications })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Apply adminRequired middleware to all /api/admin routes
app.use('/api/admin', adminRequired)

// Admin profile endpoints (admin-only)
app.get('/api/admin/profile', async (req, res) => {
  try {
  const profile = await AdminProfile.findOne({ userId: req.userId }).lean()
  if (!profile) return res.status(404).json({ message: 'Admin profile not found' })
  res.json({ success: true, profile })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

app.get('/api/admin/profile/:userId', async (req, res) => {
  try {
  const { userId } = req.params
  const profile = await AdminProfile.findOne({ userId }).lean()
  if (!profile) return res.status(404).json({ message: 'Admin profile not found' })
  res.json({ success: true, profile })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

app.post('/api/admin/profile', async (req, res) => {
  try {
  const { displayName, title, phone, avatarUrl, permissions, notes } = req.body
    const update = { displayName, title, phone, avatarUrl, permissions: Array.isArray(permissions) ? permissions : [], notes }

    const profile = await AdminProfile.findOneAndUpdate(
      { userId: req.userId },
      { $set: update, $setOnInsert: { userId: req.userId } },
      { new: true, upsert: true }
    )

    res.json({ success: true, profile })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Admin: list all users
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find().select('email role isAdmin').lean()
    res.json({ success: true, users })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Admin: stats endpoint
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const totalStudents = await User.countDocuments({ role: 'student' })
    const totalEmployers = await User.countDocuments({ role: 'employer' })
    const totalOpportunities = await Opportunity.countDocuments()

    res.json({ success: true, stats: { totalUsers, totalStudents, totalEmployers, totalOpportunities } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST create application (student applies to an opportunity)
app.post('/api/applications', authMiddleware, async (req, res) => {
  try {
    const applicantId = req.userId
    if (!applicantId) return res.status(401).json({ message: 'Unauthorized' })

    const { opportunityId, coverLetter } = req.body
    if (!opportunityId) return res.status(400).json({ message: 'opportunityId is required' })

    const opp = await Opportunity.findById(opportunityId)
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' })

    // Prevent duplicate application by same applicant for same opportunity
    const exists = await Application.findOne({ opportunity: opportunityId, applicant: applicantId })
    if (exists) return res.status(409).json({ message: 'You have already applied to this opportunity' })

    const appDoc = new Application({ opportunity: opportunityId, applicant: applicantId, coverLetter })
    await appDoc.save()

    res.status(201).json({ success: true, application: appDoc })
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
