import express from 'express'
import net from 'net'
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
import Skill from './models/Skill.js'
import AnalyticsEvent from './models/AnalyticsEvent.js'
import Plan from './models/Plan.js'
import Subscription from './models/Subscription.js'
import messagesRouter from './routes/messages.js'
import usersSearchRouter from './routes/search.js'
import eventsRouter from './routes/events.js'
import profilesRouter from './routes/profiles.js'
import { startConsumer } from './kafka/consumer.js'
import redisClient from './redis/client.js'
import { publishMessage } from './kafka/producer.js'

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
  // Only true administrators allowed
  if (requester.isAdmin !== true) return res.status(403).json({ message: 'Forbidden: admin only' })
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

// Messaging routes (all protected)
app.use('/api/messages', authMiddleware, messagesRouter)

// Users search router (protected)
app.use('/api/users', authMiddleware, usersSearchRouter)

// Profiles public/private visibility endpoints
app.use('/api/profiles', profilesRouter)

// Events (SSE) router for live updates (optional auth)
app.use('/api/events', eventsRouter)

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

  // Set role and flags; do NOT set isAdmin here
  const update = { role, isStudent: role === 'student', isEmployer: role === 'employer' }
  const user = await User.findByIdAndUpdate(userId, update, { new: true })
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

  // prefer StudentProfile then EmployerProfile, then AdminProfile
    let profile = await StudentProfile.findOne({ userId }).lean()
    if (profile) return res.json({ success: true, profile, type: 'student' })

    profile = await EmployerProfile.findOne({ userId }).lean()
    if (profile) return res.json({ success: true, profile, type: 'employer' })

  profile = await AdminProfile.findOne({ userId }).lean()
  if (profile) return res.json({ success: true, profile, type: 'admin' })

    return res.status(404).json({ success: false, message: 'Profile not found' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PATCH update basic profile fields (bio, skills array, companyWebsite etc.)
app.patch('/api/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    // Determine which profile collection exists
    let profile = await StudentProfile.findOne({ userId })
    let model = null
    if (profile) model = StudentProfile
    else {
      profile = await EmployerProfile.findOne({ userId })
      if (profile) model = EmployerProfile
    }
    if (!profile) return res.status(404).json({ message: 'Profile not found' })

    const allowed = ['bio', 'skills', 'companyWebsite', 'companyName', 'fullName', 'major', 'college', 'graduationYear']
    const update = {}
    for (const k of allowed) if (k in req.body) update[k] = req.body[k]
    if (update.skills && !Array.isArray(update.skills)) update.skills = []
    if ('graduationYear' in update) {
      const gy = Number(update.graduationYear)
      if (!Number.isFinite(gy)) delete update.graduationYear
      else update.graduationYear = gy
    }

    const next = await model.findOneAndUpdate({ userId }, { $set: update }, { new: true })
    // Emit and publish profile update so other systems and SSE clients can react
    try { eventBus && eventBus.emit && eventBus.emit('profile:updated', { userId, profile: next.toObject ? next.toObject() : next }) } catch(_){}
    try { if (redisClient && typeof redisClient.publish === 'function') await redisClient.publish('profiles:updates', JSON.stringify({ userId, profile: next.toObject ? next.toObject() : next })) } catch (rerr) { console.warn('Failed to publish profile update to Redis', rerr && rerr.message) }
    try { await publishMessage(process.env.KAFKA_PROFILE_TOPIC || 'profile-updates', { userId, profile: next.toObject ? next.toObject() : next }) } catch (kerr) { console.warn('Failed to publish profile update to Kafka', kerr && kerr.message) }
    res.json({ success: true, profile: next })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Resume & video metadata storage (no file storage yet) - simple stub
import fs from 'fs'
import path from 'path'

const uploadsDir = path.join(process.cwd(), 'server', 'uploads')
try { if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true }) } catch {}

// In-memory map for metadata until real storage added
const mediaMeta = { resumes: new Map(), videos: new Map() }

app.post('/api/profile/resume', authMiddleware, async (req, res) => {
  try {
    const { name, size } = req.body || {}
    if (!name) return res.status(400).json({ message: 'name required' })
    mediaMeta.resumes.set(req.userId, { name, size, uploadedAt: new Date() })
    res.status(201).json({ success: true, resume: mediaMeta.resumes.get(req.userId) })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

app.post('/api/profile/video', authMiddleware, async (req, res) => {
  try {
    const { name, size, durationSec } = req.body || {}
    if (!name) return res.status(400).json({ message: 'name required' })
    mediaMeta.videos.set(req.userId, { name, size, durationSec, uploadedAt: new Date() })
    res.status(201).json({ success: true, video: mediaMeta.videos.get(req.userId) })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

app.get('/api/profile/media', authMiddleware, async (req, res) => {
  res.json({ success: true, resume: mediaMeta.resumes.get(req.userId) || null, video: mediaMeta.videos.get(req.userId) || null })
})

// Student progress (mock aggregates) - would join Applications etc.
app.get('/api/analytics/student/progress', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role').lean()
    if (!user || user.role !== 'student') return res.status(403).json({ message: 'Forbidden' })
    // For now mock counts from Applications collection
    const totalApps = await Application.countDocuments({ applicant: req.userId })
    // interview/offer counts not tracked; return zero placeholders
    res.json({ success: true, progress: { applications: totalApps, interviews: 0, offers: 0 } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Employer analytics summary (mock) - aggregates from Opportunity + Application
app.get('/api/analytics/employer/overview', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role').lean()
    if (!user || (user.role !== 'employer' && user.role !== 'admin')) return res.status(403).json({ message: 'Forbidden' })
    const listings = await Opportunity.find({ owner: req.userId }).select('applicationsCount type createdAt').lean()
    const totalListings = listings.length
    const totalApplicants = listings.reduce((s, l) => s + (l.applicationsCount || 0), 0)
    const avgApplicantsPerListing = totalListings ? (totalApplicants / totalListings) : 0
    const byType = listings.reduce((acc, l) => { const t = (l.type||'other'); acc[t] = (acc[t]||0)+1; return acc }, {})
    res.json({ success: true, overview: { totalListings, totalApplicants, avgApplicantsPerListing, byType } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Habit forming: tasks + streak endpoints (local ephemeral)
const taskState = new Map() // userId -> { tasks: [...], updatedAt }
const streakState = new Map() // userId -> { current, lastDate }

app.get('/api/habits/tasks', authMiddleware, async (req, res) => {
  const existing = taskState.get(req.userId)
  if (!existing) {
    const seed = [
      { id: 'resume', label: 'Upload resume', done: false },
      { id: 'video', label: 'Record intro video', done: false },
      { id: 'apply1', label: 'Apply to 1 opportunity', done: false },
      { id: 'skill', label: 'Add 3 new skills', done: false }
    ]
    taskState.set(req.userId, { tasks: seed, updatedAt: new Date() })
    return res.json({ success: true, tasks: seed })
  }
  res.json({ success: true, tasks: existing.tasks })
})

app.post('/api/habits/tasks/:id/toggle', authMiddleware, async (req, res) => {
  const state = taskState.get(req.userId)
  if (!state) return res.status(404).json({ message: 'No tasks' })
  state.tasks = state.tasks.map(t => t.id === req.params.id ? { ...t, done: !t.done } : t)
  state.updatedAt = new Date()
  taskState.set(req.userId, state)
  res.json({ success: true, tasks: state.tasks })
})

app.get('/api/habits/streak', authMiddleware, async (req, res) => {
  const today = new Date().toDateString()
  const existing = streakState.get(req.userId)
  if (!existing) {
    const init = { current: 1, lastDate: today }
    streakState.set(req.userId, init)
    return res.json({ success: true, streak: init })
  }
  if (existing.lastDate !== today) {
    existing.current += 1
    existing.lastDate = today
    streakState.set(req.userId, existing)
  }
  res.json({ success: true, streak: existing })
})

// Opportunities routes
app.get('/api/opportunities', async (req, res) => {
  try {
    // Optional auth: if an employer is authenticated, restrict to their own listings
    let requesterUserId = null
    let requesterRole = 'guest'
    const auth = req.headers.authorization
    if (auth && auth.startsWith('Bearer ')) {
      try {
        const token = auth.slice(7)
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
        requesterUserId = payload.sub
        const user = await User.findById(requesterUserId).select('role').lean()
        if (user && user.role) requesterRole = user.role
      } catch (e) {
        // ignore token errors for this public endpoint
      }
    }

    const query = (requesterRole === 'employer' && requesterUserId)
      ? { owner: requesterUserId }
      : {}

    const items = await Opportunity.find(query).sort({ createdAt: -1 }).lean()
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
  // allow employers or admins to create opportunities (role-based)
  if (user.role !== 'employer' && user.role !== 'admin') return res.status(403).json({ message: 'Forbidden: only employers or admins can create opportunities' })

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
    // increment detail view (fire and forget)
    try { await Opportunity.findByIdAndUpdate(id, { $inc: { detailViews: 1 } }) } catch (e) {}
    res.json({ success: true, opportunity: opp })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Track events for opportunity: currently supports companySite (company site clicks)
app.post('/api/opportunities/:id/track', async (req, res) => {
  try {
    const { id } = req.params
    const { event } = req.body || {}
    if (!['companySite'].includes(event)) return res.status(400).json({ message: 'Invalid event' })
    const update = {}
    if (event === 'companySite') update.$inc = { companySiteViews: 1 }
    const opp = await Opportunity.findByIdAndUpdate(id, update, { new: true }).lean()
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' })
    res.json({ success: true, opportunity: { _id: opp._id, companySiteViews: opp.companySiteViews } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Insights for opportunity (owner/admin)
app.get('/api/opportunities/:id/insights', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const opp = await Opportunity.findById(id).lean()
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' })
    const requester = await User.findById(req.userId).select('role').lean()
    if (!requester) return res.status(401).json({ message: 'Unauthorized' })
    if (String(opp.owner) !== String(req.userId) && requester.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const applications = await Application.find({ opportunity: id }).populate('applicant', 'location skills fullName email').lean()
    const regions = {}
    const skills = {}
    applications.forEach(a => {
      const loc = (a.applicant?.location || 'Unknown').trim() || 'Unknown'
      regions[loc] = (regions[loc] || 0) + 1
      const skillList = (a.applicant?.skills || '').split(',').map(s=>s.trim()).filter(Boolean)
      skillList.forEach(s => { skills[s] = (skills[s] || 0) + 1 })
    })
    let applicantsOut
    if (req.query.full === '1') {
      const oppSkills = (opp.skillset || '').split(',').map(s=>s.trim()).filter(Boolean)
      applicantsOut = applications.map(a => {
        const userSkills = (a.applicant?.skills || '').split(',').map(s=>s.trim()).filter(Boolean)
        const intersection = oppSkills.length ? userSkills.filter(s => oppSkills.includes(s)) : []
        const matchPercent = oppSkills.length ? Math.round((intersection.length / oppSkills.length) * 100) : 0
        return {
          id: a._id,
          applicantId: a.applicant?._id,
            name: a.applicant?.fullName || 'Unknown',
          email: a.applicant?.email,
          location: a.applicant?.location || 'Unknown',
          skills: userSkills,
          matchPercent,
          status: a.status
        }
      })
    }
    res.json({ success: true, insights: {
      applicantsTotal: applications.length,
      detailViews: opp.detailViews || 0,
      companySiteViews: opp.companySiteViews || 0,
      regions,
      skills,
      applicants: applicantsOut
    } })
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

// GET current user's applications (students can list their own applications)
app.get('/api/applications/my', authMiddleware, async (req, res) => {
  try {
    const apps = await Application.find({ applicant: req.userId })
      .populate('opportunity', 'title type location applicationsCount')
      .sort({ createdAt: -1 })
      .lean()
    res.json({ success: true, applications: apps })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Update application status (employer or admin) - minimal auth: owner of opportunity or admin
app.patch('/api/applications/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body || {}
    if (!['applied','screening','interview','offer','rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }
    const appDoc = await Application.findById(id).populate('opportunity','owner')
    if (!appDoc) return res.status(404).json({ message: 'Not found' })
    const requester = await User.findById(req.userId).select('role').lean()
    if (!requester) return res.status(401).json({ message: 'Unauthorized' })
    if (String(appDoc.opportunity.owner) !== String(req.userId) && requester.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    appDoc.status = status
    appDoc.history = appDoc.history || []
    appDoc.history.push({ status })
    await appDoc.save()
    res.json({ success: true, application: appDoc })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Skills: suggest and create
// GET /api/skills/suggest?q=rea -> returns top 10 matching skills (prefix or contains)
app.get('/api/skills/suggest', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim().toLowerCase()
    if (!q || q.length < 3) return res.json({ success: true, skills: [] })
    // Use case-insensitive partial match on nameLower; prefer prefix matches first
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const prefixMatches = await Skill.find({ nameLower: { $regex: '^' + q } }).sort({ nameLower: 1 }).limit(10).lean()
    let results = prefixMatches
    if (results.length < 10) {
      const exclude = new Set(prefixMatches.map(s => s.nameLower))
      const containsMatches = await Skill.find({ nameLower: { $regex: regex } }).sort({ nameLower: 1 }).limit(10).lean()
      for (const s of containsMatches) {
        if (exclude.has(s.nameLower)) continue
        results.push(s)
        if (results.length >= 10) break
      }
    }
    res.json({ success: true, skills: results.map(s => s.name) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/skills  body: { name }
app.post('/api/skills', authMiddleware, async (req, res) => {
  try {
    const name = (req.body?.name || '').toString().trim()
    if (!name) return res.status(400).json({ message: 'name is required' })
    if (name.length > 64) return res.status(400).json({ message: 'name too long' })
    const nameLower = name.toLowerCase()
    const existing = await Skill.findOne({ nameLower })
    if (existing) return res.status(200).json({ success: true, skill: existing })
    const doc = new Skill({ name })
    await doc.save()
    res.status(201).json({ success: true, skill: doc })
  } catch (err) {
    if (err.code === 11000) return res.status(200).json({ success: true, message: 'Already exists' })
    res.status(500).json({ success: false, message: err.message })
  }
})

// Check whether current user already applied to a specific opportunity
app.get('/api/applications/check', authMiddleware, async (req, res) => {
  try {
    const { opportunityId } = req.query
    if (!opportunityId) return res.status(400).json({ message: 'opportunityId query param is required' })
    const exists = await Application.findOne({ opportunity: opportunityId, applicant: req.userId })
    res.json({ success: true, applied: !!exists })
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

    // Last 7 days visits by role
    const since = new Date(Date.now() - 7*24*60*60*1000)
    const visitsAgg = await AnalyticsEvent.aggregate([
      { $match: { ts: { $gte: since } } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ])
    const visitsByRole = Object.fromEntries(visitsAgg.map(r => [r._id, r.count]))

    res.json({ success: true, stats: { totalUsers, totalStudents, totalEmployers, totalOpportunities, visitsByRole } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Admin: analytics - time series for visits (daily buckets) over a window
app.get('/api/admin/analytics/visits', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days || '30', 10), 365)
    const since = new Date(Date.now() - days*24*60*60*1000)
    const series = await AnalyticsEvent.aggregate([
      { $match: { ts: { $gte: since } } },
      { $group: { _id: { d: { $dateToString: { format: '%Y-%m-%d', date: '$ts' } }, role: '$role' }, count: { $sum: 1 } } },
      { $sort: { '_id.d': 1 } }
    ])
    res.json({ success: true, series })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Admin: analytics - top pages and referrers
app.get('/api/admin/analytics/top', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days || '30', 10), 365)
    const since = new Date(Date.now() - days*24*60*60*1000)
    const topPages = await AnalyticsEvent.aggregate([
      { $match: { ts: { $gte: since } } },
      { $group: { _id: '$path', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ])
    const topReferrers = await AnalyticsEvent.aggregate([
      { $match: { ts: { $gte: since }, referrer: { $exists: true, $ne: '' } } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ])
    res.json({ success: true, topPages, topReferrers })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Admin: engagement metrics per role (DAU/WAU/MAU naive)
app.get('/api/admin/analytics/engagement', async (req, res) => {
  try {
    const now = Date.now()
    const days = (n) => new Date(now - n*24*60*60*1000)
    const ranges = { dau: days(1), wau: days(7), mau: days(30) }
    const result = {}
    for (const [key, since] of Object.entries(ranges)) {
      const agg = await AnalyticsEvent.aggregate([
        { $match: { ts: { $gte: since } } },
        { $group: { _id: { role: '$role', user: '$userId' }, count: { $sum: 1 } } },
        { $group: { _id: '$_id.role', users: { $sum: 1 } } }
      ])
      result[key] = Object.fromEntries(agg.map(a => [a._id || 'guest', a.users]))
    }
    res.json({ success: true, engagement: result })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Admin: plans CRUD
app.get('/api/admin/plans', async (req, res) => {
  try { const plans = await Plan.find({}).sort({ priceCents: 1 }).lean(); res.json({ success: true, plans }) } catch (e) { res.status(500).json({ success: false, message: e.message }) }
})
app.post('/api/admin/plans', async (req, res) => {
  try { const plan = new Plan(req.body); await plan.save(); res.status(201).json({ success: true, plan }) } catch (e) { res.status(400).json({ success: false, message: e.message }) }
})
app.put('/api/admin/plans/:id', async (req, res) => {
  try { const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!plan) return res.status(404).json({ message: 'Not found' }); res.json({ success: true, plan }) } catch (e) { res.status(400).json({ success: false, message: e.message }) }
})
app.delete('/api/admin/plans/:id', async (req, res) => {
  try { await Plan.findByIdAndDelete(req.params.id); res.json({ success: true }) } catch (e) { res.status(400).json({ success: false, message: e.message }) }
})

// Admin: subscriptions list (basic)
app.get('/api/admin/subscriptions', async (req, res) => {
  try {
    const subs = await Subscription.find({}).populate('userId','email').populate('planId','name priceCents interval').lean()
    res.json({ success: true, subscriptions: subs })
  } catch (e) { res.status(500).json({ success: false, message: e.message }) }
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

  const appDoc = new Application({ opportunity: opportunityId, applicant: applicantId, coverLetter, history: [{ status: 'applied', at: new Date() }] })
    await appDoc.save()

    // increment applications counter on the opportunity
    try {
      await Opportunity.findByIdAndUpdate(opportunityId, { $inc: { applicationsCount: 1 } })
    } catch (incErr) {
      console.warn('Failed to increment applicationsCount for opportunity', opportunityId, incErr.message)
    }

    // return created application and the updated counter
    const updatedOpp = await Opportunity.findById(opportunityId).lean()
    res.status(201).json({ success: true, application: appDoc, applicationsCount: updatedOpp?.applicationsCount || 0 })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Lightweight analytics: track a route view
app.post('/api/analytics/track', async (req, res) => {
  try {
    const { path, role, userId, referrer } = req.body || {}
    if (!path) return res.status(400).json({ message: 'path required' })
    const ua = req.headers['user-agent'] || ''
    const evt = new AnalyticsEvent({ path, role: role || 'guest', userId, referrer, ua })
    await evt.save()
    res.json({ success: true })
  } catch (err) {
    // do not fail loudly; analytics is best-effort
    res.json({ success: false })
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
    // Start Redis client
    try {
      await redisClient.ping()
      console.log('Connected to Redis')
    } catch (rerr) {
      console.warn('Redis not available:', rerr && rerr.message)
    }

    // Start Kafka consumer
    try {
      // Check broker reachability first to avoid noisy KafkaJS connection timeouts
  const brokers = (process.env.KAFKA_BROKER || 'localhost:9093').split(',').map(s => s.trim()).filter(Boolean)
      async function isBrokerReachable(broker) {
        return new Promise((resolve) => {
          const [host, portStr] = broker.split(':')
          const port = Number(portStr) || 9092
          const socket = new net.Socket()
          const timer = setTimeout(() => {
            socket.destroy()
            resolve(false)
          }, 2000)
          socket.once('error', () => { clearTimeout(timer); resolve(false) })
          socket.connect(port, host, () => { clearTimeout(timer); socket.end(); resolve(true) })
        })
      }

      let anyReachable = false
      for (const b of brokers) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await isBrokerReachable(b)
        console.log(`[kafka-check] broker ${b} reachable: ${ok}`)
        if (ok) { anyReachable = true; break }
      }

      if (!anyReachable) {
        console.warn('Kafka brokers unreachable; skipping Kafka consumer start. Set KAFKA_BROKER to a reachable broker (e.g. localhost:9093) or start Kafka.')
      } else {
        await startConsumer()
        console.log('Kafka consumer started')
      }
    } catch (kerr) {
      console.warn('Kafka consumer not started:', kerr && kerr.message)
    }
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

startServer()

export default app
