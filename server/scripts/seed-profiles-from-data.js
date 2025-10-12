#!/usr/bin/env node
/*
  seed-profiles-from-data.js

  Create realistic StudentProfile and EmployerProfile documents by sampling
  content from existing database collections and (optionally) recent Kafka
  messages from the `chat-messages` topic.

  Behaviour:
  - Connects to MongoDB (uses env MONGODB_URI, MONGODB_DB)
  - Gathers source material from collections: Skill, Opportunity, EmployerProfile, User
  - Optionally attempts to consume recent messages from Kafka (localhost:9092)
    topic `chat-messages` to extract sentences for bios/headlines
  - For each candidate User (students/employers) without a profile, upserts a
    basic profile assembled from sampled data (no hardcoded bios/skills/etc.)

  Run: node server/scripts/seed-profiles-from-data.js

*/

import mongoose from 'mongoose'
import StudentProfile from '../models/StudentProfile.js'
import EmployerProfile from '../models/EmployerProfile.js'
import Skill from '../models/Skill.js'
import Opportunity from '../models/Opportunity.js'
import User from '../models/User.js'

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB || 'mvp-db'
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'chat-messages'

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
  // loop until we find a free username
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await StudentProfile.findOne({ username: candidate }).select('_id').lean()
    if (!exists) return candidate
    n += 1
    candidate = `${baseSlug}-${n}`
  }
}

function sampleArray(arr, n = 1) {
  if (!Array.isArray(arr) || arr.length === 0) return []
  const out = []
  const copy = arr.slice()
  for (let i = 0; i < Math.min(n, copy.length); i += 1) {
    const idx = Math.floor(Math.random() * copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}

function sentencesFromText(txt) {
  if (!txt || typeof txt !== 'string') return []
  return txt
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)
}

async function tryConsumeKafkaSample() {
  try {
    const { Kafka } = await import('kafkajs')
    const kafka = new Kafka({ brokers: KAFKA_BROKERS })
    const consumer = kafka.consumer({ groupId: `seed-profiles-${Date.now()}` })
    await consumer.connect()
    await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false })

    const collected = []
    const start = Date.now()
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message || !message.value) return
        const text = message.value.toString()
        collected.push(text)
        if (collected.length >= 50 || Date.now() - start > 2500) {
          try { await consumer.disconnect() } catch (e) {}
        }
      }
    })

    try { await consumer.disconnect() } catch (e) {}
    return collected
  } catch (err) {
    console.warn('Kafka sample unavailable — skipping Kafka sampling:', err && err.message)
    return []
  }
}

async function main() {
  await mongoose.connect(mongoUri, { dbName })
  console.log(`Connected to MongoDB at ${mongoUri}, db '${dbName}'`)

  const [skills, opportunities, employers, users] = await Promise.all([
    Skill.find().lean().limit(1000),
    Opportunity.find().lean().limit(1000),
    EmployerProfile.find().lean().limit(1000),
    User.find().lean().limit(1000)
  ])

  console.log(`Sources: skills=${skills.length}, opportunities=${opportunities.length}, employers=${employers.length}, users=${users.length}`)

  let corpus = []
  const kafkaMessages = await tryConsumeKafkaSample()
  if (kafkaMessages && kafkaMessages.length) {
    corpus = kafkaMessages
  } else {
    corpus = opportunities.map(o => `${o.title || ''}. ${o.description || ''}`).filter(Boolean)
  }

  const sentencesPool = corpus.flatMap(sentencesFromText).filter(Boolean)
  console.log(`Built sentences pool: ${sentencesPool.length} sentences`)

  function pickHeadline() {
    const s = sampleArray(sentencesPool, 1)[0] || ''
    return (s || '').slice(0, 120)
  }
  function pickBio() {
    const pieces = sampleArray(sentencesPool, Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1)))
    return pieces.join(' ')
  }

  const skillIds = (skills || []).map(s => s._id).filter(Boolean)

  const candidateStudents = await User.find({ role: 'student' }).lean()
  console.log(`Found ${candidateStudents.length} candidate student users`)

  for (const u of candidateStudents) {
    try {
      const exists = await StudentProfile.findOne({ userId: u._id }).select('_id').lean()
      if (exists) continue

      const nameFromUser = u.fullName || (u.email ? u.email.split('@')[0] : `user${String(u._id).slice(-4)}`)
      const username = await generateUniqueUsername(nameFromUser)

      const pickedSkills = sampleArray(skillIds, Math.min(6, skillIds.length))

      const profile = {
        userId: u._id,
        fullName: nameFromUser,
        username,
        headline: pickHeadline(),
        bio: pickBio(),
        links: { portfolio: '', github: '', linkedin: '' },
        skills: pickedSkills,
        experience: [],
        education: [],
        preferences: { jobSearchStatus: 'OPEN_TO_OPPORTUNITIES' },
        visibility: 'PUBLIC',
        publicId: (Date.now().toString(36) + Math.random().toString(36).slice(2, 8))
      }

      const sampleOpp = sampleArray(opportunities, 2)
      if (sampleOpp.length) {
        profile.experience = sampleOpp.slice(0, 1).map(o => ({ title: o.title || 'Intern', company: (o.owner && o.owner.companyName) || 'Company', startDate: new Date().toISOString(), endDate: null, description: o.description || '' }))
        profile.education = [{ institution: 'University', degree: 'B.S.', fieldOfStudy: '', startDate: null, endDate: null }]
      }

      await StudentProfile.updateOne({ userId: u._id }, { $set: profile, $setOnInsert: { createdAt: new Date() } }, { upsert: true })
      console.log(`Upserted StudentProfile for user ${u.email || u._id} -> @${username}`)
    } catch (err) {
      console.warn('Failed seeding student for user', u._id, err && err.message)
    }
  }

  const candidateEmployers = await User.find({ role: 'employer' }).lean()
  console.log(`Found ${candidateEmployers.length} candidate employer users`)
  for (const u of candidateEmployers) {
    try {
      const exists = await EmployerProfile.findOne({ userId: u._id }).select('_id').lean()
      if (exists) continue

      const sampleEmployer = sampleArray(employers, 1)[0]
      let companyName = sampleEmployer?.companyName || (opportunities.find(o => o.owner && o.owner.companyName) || {}).owner?.companyName || (u.companyName || (u.email ? u.email.split('@')[1].split('.')[0] : null))

      if (!companyName) companyName = `Company ${String(u._id).slice(-4)}`

      const profile = {
        userId: u._id,
        fullName: u.fullName || companyName,
        companyName,
        companyWebsite: (sampleEmployer && sampleEmployer.companyWebsite) || '',
        about: pickBio(),
        contactEmail: u.email,
        location: sampleEmployer?.location || '',
        publicId: (Date.now().toString(36) + Math.random().toString(36).slice(2, 8))
      }

      await EmployerProfile.updateOne({ userId: u._id }, { $set: profile, $setOnInsert: { createdAt: new Date() } }, { upsert: true })
      console.log(`Upserted EmployerProfile for user ${u.email || u._id} -> ${companyName}`)
    } catch (err) {
      console.warn('Failed seeding employer for user', u._id, err && err.message)
    }
  }

  console.log('Seeding complete.')
  await mongoose.disconnect()
  process.exit(0)
}

main().catch(err => {
  console.error('Seed script failed:', err && err.message)
  process.exit(1)
})
