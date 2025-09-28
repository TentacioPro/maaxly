import express from 'express'
import mongoose from 'mongoose'
import { GridFSBucket } from 'mongodb'
import StudentProfile from '../models/StudentProfile.js'
import EmployerProfile from '../models/EmployerProfile.js'

const router = express.Router()

// Public: get student profile by username
router.get('/username/:username', async (req, res) => {
  try {
    const { username } = req.params
    const profile = await StudentProfile.findOne({ username })
      .populate('skills', 'name')
      .lean()
    if (!profile) return res.status(404).json({ message: 'Profile not found' })
    return res.json({ success: true, profile })
  } catch (e) {
    return res.status(500).json({ message: e.message })
  }
})

// Public: get student profile by publicId
router.get('/id/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params
    const profile = await StudentProfile.findOne({ publicId })
      .populate('skills', 'name')
      .lean()
    if (!profile) return res.status(404).json({ message: 'Profile not found' })
    return res.json({ success: true, profile })
  } catch (e) {
    return res.status(500).json({ message: e.message })
  }
})
// Public: get avatar by publicId (streams image if allowed)
router.get('/avatar/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params
    const profile = await StudentProfile.findOne({ publicId }).select('avatarFileId avatarFilename avatarContentType avatarUploadedAt visibility').lean()
    if (!profile || !profile.avatarFileId) return res.status(404).json({ message: 'No avatar' })
    // Only allow if profile is PUBLIC or UNLISTED
    if (profile.visibility === 'PRIVATE') return res.status(403).json({ message: 'Profile is private' })
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'avatars' })
    const stream = bucket.openDownloadStream(new mongoose.Types.ObjectId(String(profile.avatarFileId)))
    res.setHeader('Content-Type', profile.avatarContentType || 'image/png')
    res.setHeader('Content-Disposition', `inline; filename="${profile.avatarFilename || 'avatar.png'}"`)
    stream.on('error', () => res.status(404).end())
    stream.pipe(res)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// GET /api/profile/avatar/username/:username
router.get('/avatar/username/:username', async (req, res) => {
  try {
    const { username } = req.params
    const profile = await StudentProfile.findOne({ username }).select('avatarFileId avatarFilename avatarContentType avatarUploadedAt visibility').lean()
    if (!profile || !profile.avatarFileId) return res.status(404).json({ message: 'No avatar' })
    if (profile.visibility === 'PRIVATE') return res.status(403).json({ message: 'Profile is private' })
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'avatars' })
    const stream = bucket.openDownloadStream(new mongoose.Types.ObjectId(String(profile.avatarFileId)))
    res.setHeader('Content-Type', profile.avatarContentType || 'image/png')
    res.setHeader('Content-Disposition', `inline; filename="${profile.avatarFilename || 'avatar.png'}"`)
    stream.on('error', () => res.status(404).end())
    stream.pipe(res)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// Public: get employer profile by either profile id or user id
router.get('/employer/:id', async (req, res) => {
  try {
    const { id } = req.params
    const or = []
    if (mongoose.Types.ObjectId.isValid(id)) {
      or.push({ _id: new mongoose.Types.ObjectId(id) })
      or.push({ userId: new mongoose.Types.ObjectId(id) })
    }
    // Allow string userId fallback (in case ids are stored as strings)
    or.push({ userId: id })

    const profile = await EmployerProfile.findOne({ $or: or })
      .select('companyName companyWebsite fullName userId about description contactEmail contactPhone location industry size socialLinks')
      .lean()

    if (!profile) return res.status(404).json({ message: 'Employer profile not found' })

    return res.json({ success: true, profile })
  } catch (e) {
    return res.status(500).json({ message: e.message })
  }
})

export default router
