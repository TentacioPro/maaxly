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
import publicProfileRouter from './routes/profileRoutes.js'
import { startConsumer } from './kafka/consumer.js'
import redisClient from './redis/client.js'
import { publishMessage } from './kafka/producer.js'
import multer from 'multer'
import { GridFSBucket } from 'mongodb'

const app = express()
const port = process.env.PORT || 4000
// Mongo connection: allow automatic docker auth URI construction if root creds provided
let mongoUri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'mvp-db'
if (!mongoUri) {
  const rootUser = process.env.MONGO_INITDB_ROOT_USERNAME
  const rootPass = process.env.MONGO_INITDB_ROOT_PASSWORD
  const host = process.env.MONGODB_HOST || 'localhost'
  if (rootUser && rootPass) {
    mongoUri = `mongodb://${rootUser}:${rootPass}@${host}:27017/${dbName}?authSource=admin`
    console.log('[mongo] constructed auth URI from root env vars')
  } else {
    mongoUri = 'mongodb://localhost:27017'
    console.log('[mongo] using unauthenticated localhost URI (no root creds found)')
  }
}
// Shared multer instance for multipart uploads (resume, attachments)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }) // 25MB

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

async function attachCompanyProfiles(docs) {
  if (!docs) return docs
  const items = Array.isArray(docs) ? docs : [docs]
  if (!items.length) return docs

  const ownerIds = Array.from(new Set(items
    .map((item) => {
      if (!item || !item.owner) return null
      if (typeof item.owner === 'object' && item.owner._id) return String(item.owner._id)
      return String(item.owner)
    })
    .filter(Boolean)))

  if (!ownerIds.length) return docs

  const profiles = await EmployerProfile.find({ userId: { $in: ownerIds } })
    .select('_id userId companyName companyWebsite fullName contactEmail contactPhone location industry')
    .lean()

  const byOwner = new Map(profiles.map((profile) => [String(profile.userId), profile]))

  const enhanced = items.map((item) => {
    if (!item) return item
    const key = typeof item.owner === 'object' && item.owner._id ? String(item.owner._id) : String(item.owner || '')
    const profile = byOwner.get(key)
    if (!profile) {
      return { ...item, companyProfile: null }
    }
    return {
      ...item,
      companyProfile: {
        _id: profile._id,
        userId: profile.userId,
        companyName: profile.companyName || profile.fullName || null,
        companyWebsite: profile.companyWebsite || null,
        contactEmail: profile.contactEmail || null,
        contactPhone: profile.contactPhone || null,
        location: profile.location || null,
        industry: profile.industry || null
      },
      company: profile.companyName || item.company || null,
      companyName: profile.companyName || item.companyName || item.company || null
    }
  })

  return Array.isArray(docs) ? enhanced : enhanced[0]
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
function slugifyName(name) {
  return (name || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function generateUniqueUsername(base) {
  const baseSlug = slugifyName(base) || 'user'
  let candidate = baseSlug
  let n = 1
  // Probe for existence; increment suffix until free
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Using StudentProfile model imported above
    const exists = await StudentProfile.findOne({ username: candidate }).select('_id').lean()
    if (!exists) return candidate
    n += 1
    candidate = `${baseSlug}-${n}`
  }
}

async function handleCreateStudentProfile(req, res) {
  try {
    const targetUserId = req.params.userId || req.userId
    if (!targetUserId) return res.status(401).json({ message: 'Unauthorized' })
    if (req.userId !== targetUserId) return res.status(403).json({ message: 'Forbidden: userId does not match token' })

    const { fullName, college, graduationYear, major } = req.body
    let { skills } = req.body

    // Normalize skills to ObjectId refs from names if provided as strings
    if (Array.isArray(skills)) {
      const byName = await Skill.find({ name: { $in: skills.filter(s => typeof s === 'string') } }).select('_id name').lean()
      const idSet = new Set()
      for (const s of skills) {
        if (typeof s === 'string') {
          const found = byName.find(x => x.name === s)
          if (found) idSet.add(String(found._id))
        } else if (s && s._id) {
          idSet.add(String(s._id))
        } else if (typeof s === 'object' && s.id) {
          idSet.add(String(s.id))
        } else if (typeof s === 'string' && s.match(/^[a-f0-9]{24}$/)) {
          idSet.add(s)
        }
      }
      skills = Array.from(idSet)
    } else {
      skills = []
    }

    const update = {
      fullName,
      college,
      graduationYear: graduationYear ? Number(graduationYear) : undefined,
      major,
      skills
    }

    // Generate a unique username from fullName
    const username = await generateUniqueUsername(fullName || 'student')

  const profileDoc = new StudentProfile({ userId: targetUserId, username, ...update })
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

// Public profile endpoints (no auth)
app.use('/api/profile', publicProfileRouter)

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
    let profile = await StudentProfile.findOne({ userId }).populate('skills','name').lean()
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

    // Allowed fields depend on profile type
  const allowedStudent = ['bio','skills','fullName','major','college','graduationYear','username','profilePictureUrl','location','headline','links','preferences','visibility','experience','education']
    const allowedEmployer = ['bio','companyWebsite','companyName','fullName']
    const allowed = model === StudentProfile ? allowedStudent : allowedEmployer
    const update = {}
    for (const k of allowed) if (k in req.body) update[k] = req.body[k]
    if (model === StudentProfile && update.skills) {
      if (!Array.isArray(update.skills)) update.skills = []
      else {
        const input = update.skills
        const byName = await Skill.find({ name: { $in: input.filter(s => typeof s === 'string') } }).select('_id name').lean()
        const idSet = new Set()
        for (const s of input) {
          if (typeof s === 'string') {
            const found = byName.find(x => x.name === s)
            if (found) idSet.add(String(found._id))
          } else if (s && s._id) {
            idSet.add(String(s._id))
          } else if (typeof s === 'object' && s.id) {
            idSet.add(String(s.id))
          } else if (typeof s === 'string' && s.match(/^[a-f0-9]{24}$/)) {
            idSet.add(s)
          }
        }
        update.skills = Array.from(idSet)
      }
    }
    if ('graduationYear' in update) {
      const gy = Number(update.graduationYear)
      if (!Number.isFinite(gy)) delete update.graduationYear
      else update.graduationYear = gy
    }

    let next
    try {
      next = await model.findOneAndUpdate({ userId }, { $set: update }, { new: true, runValidators: true })
    } catch (e) {
      if (e && e.code === 11000 && String(e.message || '').includes('username')) {
        return res.status(409).json({ success: false, message: 'Username already taken' })
      }
      throw e
    }
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
// ---- Resume (GridFS) real upload/download ----
app.post('/api/profile/resume', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'file required' })
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'resumes' })
    const { buffer, originalname, mimetype } = req.file
    const stream = bucket.openUploadStream(originalname, { contentType: mimetype })
    stream.end(buffer)
    stream.on('error', (e) => res.status(500).json({ message: e.message }))
    stream.on('finish', async () => {
      const fileId = stream.id
      const update = {
        resumeFileId: fileId,
        resumeFilename: originalname,
        resumeContentType: mimetype,
        resumeUploadedAt: new Date()
      }
      await StudentProfile.findOneAndUpdate(
        { userId: req.userId },
        { $set: update },
        { new: true, upsert: true }
      )
      res.status(201).json({ success: true, resume: { name: originalname, uploadedAt: update.resumeUploadedAt, fileId } })
    })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

app.post('/api/profile/video', authMiddleware, async (req, res) => {
  try {
    // Keep as metadata-only stub for now
    const { name, size, durationSec } = req.body || {}
    res.status(201).json({ success: true, video: { name, size, durationSec, uploadedAt: new Date() } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

app.get('/api/profile/media', authMiddleware, async (req, res) => {
  try {
    const prof = await StudentProfile.findOne({ userId: req.userId }).select('resumeFilename resumeUploadedAt resumeFileId resumeContentType avatarFileId avatarFilename avatarContentType avatarUploadedAt').lean()
    const resume = prof && prof.resumeFileId ? {
      name: prof.resumeFilename,
      uploadedAt: prof.resumeUploadedAt,
      fileId: prof.resumeFileId,
      contentType: prof.resumeContentType
    } : null
    const avatar = prof && prof.avatarFileId ? {
      name: prof.avatarFilename,
      uploadedAt: prof.avatarUploadedAt,
      fileId: prof.avatarFileId,
      contentType: prof.avatarContentType
    } : null
    res.json({ success: true, resume, avatar, video: null })
  } catch (e) { res.status(500).json({ success: false, message: e.message }) }
})

app.get('/api/profile/resume/download', authMiddleware, async (req, res) => {
  try {
    const prof = await StudentProfile.findOne({ userId: req.userId }).select('resumeFileId resumeFilename resumeContentType').lean()
    if (!prof || !prof.resumeFileId) return res.status(404).json({ message: 'No resume' })
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'resumes' })
    const stream = bucket.openDownloadStream(new mongoose.Types.ObjectId(String(prof.resumeFileId)))
    res.setHeader('Content-Type', prof.resumeContentType || 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${prof.resumeFilename || 'resume.pdf'}"`)
    stream.on('error', () => res.status(404).end())
    stream.pipe(res)
  } catch (e) { res.status(500).json({ success: false, message: e.message }) }
})

// Avatar (Profile photo) upload/download via GridFS
app.post('/api/profile/avatar', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'file required' })
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'avatars' })
    const { buffer, originalname, mimetype } = req.file
    const stream = bucket.openUploadStream(originalname, { contentType: mimetype })
    stream.end(buffer)
    stream.on('error', (e) => res.status(500).json({ message: e.message }))
    stream.on('finish', async () => {
      const fileId = stream.id
      const update = {
        avatarFileId: fileId,
        avatarFilename: originalname,
        avatarContentType: mimetype,
        avatarUploadedAt: new Date()
      }
      await StudentProfile.findOneAndUpdate(
        { userId: req.userId },
        { $set: update },
        { new: true, upsert: true }
      )
      res.status(201).json({ success: true, avatar: { name: originalname, uploadedAt: update.avatarUploadedAt, fileId } })
    })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

app.get('/api/profile/avatar/download', authMiddleware, async (req, res) => {
  try {
    const prof = await StudentProfile.findOne({ userId: req.userId }).select('avatarFileId avatarFilename avatarContentType').lean()
    if (!prof || !prof.avatarFileId) return res.status(404).json({ message: 'No avatar' })
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'avatars' })
    const stream = bucket.openDownloadStream(new mongoose.Types.ObjectId(String(prof.avatarFileId)))
    res.setHeader('Content-Type', prof.avatarContentType || 'image/png')
    res.setHeader('Content-Disposition', `inline; filename="${prof.avatarFilename || 'avatar.png'}"`)
    stream.on('error', () => res.status(404).end())
    stream.pipe(res)
  } catch (e) { res.status(500).json({ success: false, message: e.message }) }
})

// Student progress (mock aggregates) - would join Applications etc.
app.get('/api/analytics/student/progress', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role').lean()
    if (!user || user.role !== 'student') return res.status(403).json({ message: 'Forbidden' })
    const applications = await Application.find({ applicant: req.userId })
      .select('status createdAt')
      .sort({ createdAt: -1 })
      .lean()

    const statusCounts = { applied: 0, screening: 0, interview: 0, offer: 0, rejected: 0 }
    let lastActivityAt = null
    for (const appDoc of applications) {
      const status = (appDoc.status || 'applied').toLowerCase()
      if (statusCounts[status] !== undefined) statusCounts[status] += 1
      else statusCounts.applied += 1
      const created = appDoc.createdAt ? new Date(appDoc.createdAt).getTime() : null
      if (created && (!lastActivityAt || created > lastActivityAt)) lastActivityAt = created
    }

    const totalApplications = applications.length
    res.json({
      success: true,
      progress: {
        applications: totalApplications,
        interviews: statusCounts.interview + statusCounts.screening,
        offers: statusCounts.offer,
        rejected: statusCounts.rejected,
        statusBreakdown: statusCounts,
        lastActivityAt
      }
    })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Employer analytics summary (mock) - aggregates from Opportunity + Application
app.get('/api/analytics/employer/overview', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role').lean()
    if (!user || (user.role !== 'employer' && user.role !== 'admin')) return res.status(403).json({ message: 'Forbidden' })
    const listings = await Opportunity.find({ owner: req.userId })
      .select('title type applicationsCount detailViews companySiteViews skills skillset categories createdAt location')
      .lean()
    const listingMap = new Map(listings.map((l) => [String(l._id), l]))

    const totalListings = listings.length
    const opportunityIds = listings.map((l) => l._id)
    const applications = opportunityIds.length
      ? await Application.find({ opportunity: { $in: opportunityIds } })
        .select('opportunity status createdAt')
        .populate('applicant', 'email fullName')
        .lean()
      : []

    const byType = listings.reduce((acc, l) => {
      const t = (l.type || 'other').toLowerCase()
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})

    const detailViewsTotal = listings.reduce((sum, l) => sum + (l.detailViews || 0), 0)
    const siteViewsTotal = listings.reduce((sum, l) => sum + (l.companySiteViews || 0), 0)

    const appsByOpp = new Map()
    for (const appDoc of applications) {
      const key = String(appDoc.opportunity)
      const meta = appsByOpp.get(key) || { count: 0, lastApplicationAt: null, status: { applied: 0, screening: 0, interview: 0, offer: 0, rejected: 0 } }
      meta.count += 1
      const status = (appDoc.status || 'applied').toLowerCase()
      if (meta.status[status] !== undefined) meta.status[status] += 1
      else meta.status.applied += 1
      const createdTs = appDoc.createdAt ? new Date(appDoc.createdAt).getTime() : null
      if (createdTs && (!meta.lastApplicationAt || createdTs > meta.lastApplicationAt)) meta.lastApplicationAt = createdTs
      appsByOpp.set(key, meta)
    }

    const totalApplicants = Array.from(appsByOpp.values()).reduce((sum, meta) => sum + meta.count, 0)
    const avgApplicantsPerListing = totalListings ? (totalApplicants / totalListings) : 0

    const topListings = listings
      .map((listing) => {
        const key = String(listing._id)
        const meta = appsByOpp.get(key)
        const parsedSkills = []
        const rawSkills = [listing.skills, listing.skillset]
          .filter(Boolean)
          .join(',')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        parsedSkills.push(...rawSkills)
        return {
          id: key,
          title: listing.title,
          type: listing.type,
          applications: meta ? meta.count : (listing.applicationsCount || 0),
          detailViews: listing.detailViews || 0,
          siteViews: listing.companySiteViews || 0,
          lastApplicationAt: meta?.lastApplicationAt || null,
          statusBreakdown: meta?.status || null,
          skills: parsedSkills
        }
      })
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 5)

    const skillCounts = new Map()
    for (const listing of listings) {
      const raw = [listing.skills, listing.skillset]
        .filter(Boolean)
        .join(',')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const skill of raw) {
        const normalized = skill.replace(/\s+/g, ' ').trim()
        if (!normalized) continue
        const current = skillCounts.get(normalized) || 0
        skillCounts.set(normalized, current + 1)
      }
    }
    const topSkills = Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }))

    const now = Date.now()
    const dayAgo = now - (24 * 60 * 60 * 1000)
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000)
    let newApplicants24h = 0
    let newApplicants7d = 0
    for (const appDoc of applications) {
      const created = appDoc.createdAt ? new Date(appDoc.createdAt).getTime() : null
      if (!created) continue
      if (created >= dayAgo) newApplicants24h += 1
      if (created >= weekAgo) newApplicants7d += 1
    }

    const recentApplicants = applications
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 6)
      .map((appDoc) => {
        const listing = listingMap.get(String(appDoc.opportunity))
        return {
          id: String(appDoc._id),
          status: appDoc.status || 'applied',
          createdAt: appDoc.createdAt || null,
          opportunityId: appDoc.opportunity ? String(appDoc.opportunity) : null,
          opportunityTitle: listing ? listing.title : 'Opportunity',
          applicantEmail: appDoc.applicant?.email || null,
          applicantName: appDoc.applicant?.fullName || null
        }
      })

    const engagementNotes = []
    if (topListings[0]) {
      engagementNotes.push(`${topListings[0].title} is attracting the most applicants (${topListings[0].applications}).`)
    }
    if (detailViewsTotal) {
      engagementNotes.push(`Your listings have been viewed ${detailViewsTotal} times.`)
    }
    if (avgApplicantsPerListing) {
      engagementNotes.push(`Average applicants per listing sits at ${avgApplicantsPerListing.toFixed(1)}.`)
    }
    if (newApplicants24h) {
      engagementNotes.push(`${newApplicants24h} new applicants arrived in the last 24 hours.`)
    }
    if (!engagementNotes.length) {
      engagementNotes.push('Publish and share opportunities to start receiving applications.')
    }

    const lastApplicant = recentApplicants[0] || null

    res.json({
      success: true,
      overview: {
        totalListings,
        totalApplicants,
        avgApplicantsPerListing,
        byType,
        funnel: {
          views: detailViewsTotal,
          siteVisits: siteViewsTotal,
          applies: totalApplicants,
          viewToApplyRate: detailViewsTotal ? totalApplicants / detailViewsTotal : null,
          siteToApplyRate: siteViewsTotal ? totalApplicants / (siteViewsTotal || 1) : null,
          viewToSiteRate: detailViewsTotal ? siteViewsTotal / detailViewsTotal : null
        },
        topListings,
        topSkills,
        engagementNotes,
        recentApplicants,
        activity: {
          newApplicants24h,
          newApplicants7d,
          lastApplicationAt: lastApplicant?.createdAt || null,
          lastApplicationOpportunity: lastApplicant?.opportunityTitle || null,
          totalViews: detailViewsTotal,
          totalSiteViews: siteViewsTotal
        }
      }
    })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

app.get('/api/analytics/employer/applicants', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role').lean()
    if (!user || (user.role !== 'employer' && user.role !== 'admin')) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const listings = await Opportunity.find({ owner: req.userId })
      .select('_id title type detailViews companySiteViews createdAt')
      .lean()

    if (!listings.length) {
      return res.json({ success: true, applicants: [] })
    }

    const listingMap = new Map(listings.map((listing) => [String(listing._id), listing]))
    const opportunityIds = listings.map((listing) => listing._id)

    const applications = await Application.find({ opportunity: { $in: opportunityIds } })
      .populate('applicant', 'fullName email')
      .populate('opportunity', 'title type')
      .sort({ createdAt: -1 })
      .lean()

    const applicantIds = Array.from(new Set(applications
      .map((appDoc) => {
        const id = appDoc.applicant && (appDoc.applicant._id || appDoc.applicant)
        return id ? String(id) : null
      })
      .filter(Boolean)))

    const profiles = applicantIds.length
      ? await StudentProfile.find({ userId: { $in: applicantIds } })
        .select('userId username publicId fullName location headline links visibility')
        .populate('skills', 'name')
        .lean()
      : []

    const profileMap = new Map(profiles.map((profile) => [String(profile.userId), profile]))

    const applicants = applications.map((appDoc) => {
      const listingId = appDoc.opportunity?._id || appDoc.opportunity
      const listing = listingId ? listingMap.get(String(listingId)) : null
      const applicantId = appDoc.applicant && (appDoc.applicant._id || appDoc.applicant)
      const profile = applicantId ? profileMap.get(String(applicantId)) : null
      const skills = profile?.skills ? profile.skills.map((skill) => skill.name).filter(Boolean) : []

      return {
        id: String(appDoc._id),
        status: appDoc.status || 'applied',
        createdAt: appDoc.createdAt || null,
        opportunityId: listing ? String(listing._id) : (listingId ? String(listingId) : null),
        opportunityTitle: appDoc.opportunity?.title || listing?.title || 'Opportunity',
        opportunityType: appDoc.opportunity?.type || listing?.type || null,
        applicant: {
          id: applicantId ? String(applicantId) : null,
          name: appDoc.applicant?.fullName || profile?.fullName || appDoc.applicant?.email || 'Applicant',
          email: appDoc.applicant?.email || null
        },
        applicantProfile: profile ? {
          username: profile.username || null,
          publicId: profile.publicId || null,
          fullName: profile.fullName || null,
          location: profile.location || null,
          headline: profile.headline || null,
          skills,
          visibility: profile.visibility || null
        } : null
      }
    })

    res.json({ success: true, applicants })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
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
    const opportunities = await attachCompanyProfiles(items)
    res.json({ success: true, opportunities })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Get opportunities owned by the authenticated employer
app.get('/api/opportunities/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    const items = await Opportunity.find({ owner: userId }).sort({ createdAt: -1 }).lean()
    const opportunities = await attachCompanyProfiles(items)
    res.json({ success: true, opportunities })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Add protected endpoint to return only opportunities created by the currently logged-in employer
app.get('/api/opportunities/my-listings', authMiddleware, async (req, res) => {
  try {
    // Find opportunities where the owner matches the authenticated user's id
    const myListings = await Opportunity.find({ owner: req.userId }).sort({ createdAt: -1 }).lean()
    const opportunities = await attachCompanyProfiles(myListings)
    return res.json(opportunities)
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
    const oppDoc = await Opportunity.findById(id).lean()
    if (!oppDoc) return res.status(404).json({ message: 'Opportunity not found' })
    // increment detail view (fire and forget)
    try { await Opportunity.findByIdAndUpdate(id, { $inc: { detailViews: 1 } }) } catch (e) {}
    const opportunity = await attachCompanyProfiles(oppDoc)
    res.json({ success: true, opportunity })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Track events for opportunity: currently supports companySite (company site clicks)
app.post('/api/opportunities/:id/track', async (req, res) => {
  try {
    const { id } = req.params
    const { event } = req.body || {}
    const valid = ['companySite','detail','listClick']
    if (!valid.includes(event)) return res.status(400).json({ message: 'Invalid event' })
    const update = {}
    if (event === 'companySite') update.$inc = { companySiteViews: 1 }
    if (event === 'detail') update.$inc = { detailViews: 1 }
    const opp = await Opportunity.findByIdAndUpdate(id, update, { new: true }).lean()
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' })
    try {
      const ownerId = opp.owner
      const payload = { type: 'analytics', event, opportunityId: String(opp._id), ownerId: String(ownerId), detailViews: opp.detailViews || 0, companySiteViews: opp.companySiteViews || 0, ts: Date.now() }
      await redisClient.publish(`analytics:opportunity:${ownerId}`, JSON.stringify(payload))
    } catch (e) { /* ignore */ }
    res.json({ success: true, opportunity: { _id: opp._id, companySiteViews: opp.companySiteViews, detailViews: opp.detailViews } })
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
    // Attach applicant profile identifiers (username, publicId) for linking
    try {
      const userIds = Array.from(new Set(applications.map(a => a.applicant && (a.applicant._id ? String(a.applicant._id) : String(a.applicant))).filter(Boolean)))
      const profiles = await StudentProfile.find({ userId: { $in: userIds } }).select('userId username publicId').lean()
      const byUser = new Map(profiles.map(p => [String(p.userId), p]))
      applications.forEach(a => {
        const uid = a.applicant && (a.applicant._id ? String(a.applicant._id) : String(a.applicant))
        const p = byUser.get(uid)
        a.applicantProfile = p ? { username: p.username, publicId: p.publicId } : null
      })
    } catch (e) {
      // non-fatal
    }
    res.json({ success: true, applicants: applications })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET current user's applications (students can list their own applications)
app.get('/api/applications/my', authMiddleware, async (req, res) => {
  try {
    const apps = await Application.find({ applicant: req.userId })
      .populate('opportunity', 'title type location applicationsCount detailViews companySiteViews skills skillset categories')
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

// -------- Opportunity Attachments (GridFS) --------

function requireOwnerOrAdmin(req, res, next) {
  authMiddleware(req, res, async () => {
    try {
      const { id } = req.params
      const opp = await Opportunity.findById(id)
      if (!opp) return res.status(404).json({ message: 'Opportunity not found' })
      const me = await User.findById(req.userId).select('role')
      if (!me) return res.status(401).json({ message: 'Unauthorized' })
      const isOwner = String(opp.owner) === String(req.userId)
      if (!isOwner && me.role !== 'admin') return res.status(403).json({ message: 'Forbidden' })
      req.opportunityDoc = opp
      next()
    } catch (e) { res.status(500).json({ message: e.message }) }
  })
}

app.post('/api/opportunities/:id/attachments', requireOwnerOrAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'file required' })
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'attachments' })
    // Use native stream from uploaded buffer
    const { buffer, originalname, mimetype, size } = req.file
    const uploadStream = bucket.openUploadStream(originalname, { contentType: mimetype })
    uploadStream.end(buffer)
    uploadStream.on('error', (err) => res.status(500).json({ message: err.message }))
    uploadStream.on('finish', async () => {
      const fileId = uploadStream.id
      const meta = { fileId, filename: originalname, length: size, contentType: mimetype, uploadedAt: new Date() }
      await Opportunity.findByIdAndUpdate(req.opportunityDoc._id, { $push: { attachments: meta } })
      res.status(201).json({ success: true, attachment: meta })
    })
  } catch (e) { res.status(500).json({ success: false, message: e.message }) }
})

app.get('/api/opportunities/:id/attachments', authMiddleware, async (req, res) => {
  try {
    const opp = await Opportunity.findById(req.params.id).select('attachments owner').lean()
    if (!opp) return res.status(404).json({ message: 'Not found' })
    // Publicly viewable list (names/meta), download still protected below
    res.json({ success: true, attachments: opp.attachments || [] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

app.get('/api/opportunities/:id/attachments/:fileId', authMiddleware, async (req, res) => {
  try {
    const { id, fileId } = req.params
    const opp = await Opportunity.findById(id).select('attachments').lean()
    if (!opp) return res.status(404).json({ message: 'Not found' })
    const att = (opp.attachments || []).find(a => String(a.fileId) === String(fileId))
    if (!att) return res.status(404).json({ message: 'File not found' })
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'attachments' })
    const stream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId))
    res.setHeader('Content-Type', att.contentType || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${att.filename || 'file'}"`)
    stream.on('error', () => res.status(404).end())
    stream.pipe(res)
  } catch (e) { res.status(500).json({ message: e.message }) }
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
    // Backfill publicId for existing student profiles missing it
    try {
      const missing = await StudentProfile.find({ $or: [ { publicId: { $exists: false } }, { publicId: null }, { publicId: '' } ] }).select('_id publicId').lean()
      if (missing && missing.length) {
        console.log(`[backfill] Assigning publicId for ${missing.length} student profiles`)
        for (const m of missing) {
          const ts = Date.now().toString(36)
          const rnd = Math.random().toString(36).slice(2, 8)
          const publicId = `${ts}${rnd}`
          // eslint-disable-next-line no-await-in-loop
          await StudentProfile.findByIdAndUpdate(m._id, { $set: { publicId } })
        }
      }
    } catch (bfErr) {
      console.warn('[backfill] publicId assignment failed:', bfErr && bfErr.message)
    }
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
  const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || 'localhost:9092').split(',').map(s => s.trim()).filter(Boolean)
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
        console.warn('Kafka brokers unreachable; skipping Kafka consumer start. Set KAFKA_BROKERS/KAFKA_BROKER to a reachable broker (e.g. localhost:9092) and ensure Docker compose is running.')
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
