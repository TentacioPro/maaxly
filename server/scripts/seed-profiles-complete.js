#!/usr/bin/env node
/*
  seed-profiles-complete.js

  Creates NEW users (students & employers) with realistic, fully-populated
  profiles using existing database content and (optionally) recent Kafka
  messages for bios/headlines. No hardcoded bios: all text is derived from DB
  (Opportunity descriptions) or Kafka topic messages. Skill IDs are mapped from
  Skill collection; if too few skills exist, we derive them from Opportunity
  skill fields or Kafka.

  Environment:
    MONGODB_URI       (default mongodb://localhost:27017)
    MONGODB_DB        (default mvp-db)
    KAFKA_BROKERS     (default localhost:9092)
    KAFKA_TOPIC       (default chat-messages)
    STUDENT_COUNT     (default 15)
    EMPLOYER_COUNT    (default 8)

  Run:
    node server/scripts/seed-profiles-complete.js

  Output:
    Prints created credentials (email + password) for quick testing.
*/

import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import StudentProfile from '../models/StudentProfile.js'
import EmployerProfile from '../models/EmployerProfile.js'
import Skill from '../models/Skill.js'
import Opportunity from '../models/Opportunity.js'
import User from '../models/User.js'

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB || 'mvp-db'
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'chat-messages'
const STUDENT_COUNT = Number(process.env.STUDENT_COUNT || 15)
const EMPLOYER_COUNT = Number(process.env.EMPLOYER_COUNT || 8)

// ---------- Utils ----------
function slugify(s) {
  return (s || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function generateUniqueUsername(base) {
  const baseSlug = slugify(base) || 'user'
  let candidate = baseSlug
  let n = 1
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

function wordsFromText(txt) {
  if (!txt) return []
  return (txt.toLowerCase().match(/[a-z][a-z0-9+.#-]{2,20}/g) || [])
}

async function tryConsumeKafka() {
  try {
    const { Kafka } = await import('kafkajs')
    const kafka = new Kafka({ brokers: KAFKA_BROKERS })
    const consumer = kafka.consumer({ groupId: `seed-profiles-complete-${Date.now()}` })
    await consumer.connect()
    await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false })

    const collected = []
    const start = Date.now()
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message || !message.value) return
        collected.push(message.value.toString())
        if (collected.length >= 100 || Date.now() - start > 3000) {
          try { await consumer.disconnect() } catch (e) {}
        }
      }
    })

    try { await consumer.disconnect() } catch (e) {}
    return collected
  } catch (err) {
    console.warn('[seed] Kafka not available, proceeding without it:', err && err.message)
    return []
  }
}

async function upsertSkillNames(names) {
  const ids = []
  for (const raw of names) {
    const name = String(raw).trim()
    if (!name) continue
    // eslint-disable-next-line no-await-in-loop
    const doc = await Skill.findOneAndUpdate(
      { nameLower: name.toLowerCase() },
      { $set: { name, nameLower: name.toLowerCase() } },
      { upsert: true, new: true }
    )
    ids.push(doc._id)
  }
  return ids
}

function buildRandomUrls(username, companySlug) {
  const u = slugify(username || 'user')
  const c = slugify(companySlug || 'company')
  return {
    avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(u)}`,
    portfolio: `https://www.${u}.portfolio.dev/`,
    github: `https://github.com/${u}`,
    linkedin: `https://www.linkedin.com/in/${u}/`,
    companySite: `https://www.${c}.com/`
  }
}

function pickHeadline(sentencesPool) {
  const s = sampleArray(sentencesPool, 1)[0] || ''
  return (s || '').slice(0, 120)
}

function pickBio(sentencesPool) {
  const pieces = sampleArray(sentencesPool, Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1)))
  return pieces.join(' ')
}

async function ensureSkillPool(skills, opportunities, kafkaMessages) {
  if (skills.length >= 10) return skills

  const fromOpp = opportunities.flatMap(o => (
    [o.skillset, o.skills]
      .filter(Boolean)
      .flatMap(s => String(s).split(',').map(x => x.trim()).filter(Boolean))
  ))

  let candidateWords = fromOpp
  if (candidateWords.length < 10 && kafkaMessages.length) {
    const words = kafkaMessages.flatMap(wordsFromText)
    const counts = new Map()
    for (const w of words) counts.set(w, (counts.get(w) || 0) + 1)
    candidateWords = [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 50).map(([w])=>w)
  }

  const unique = Array.from(new Set(candidateWords.map(w => w.toLowerCase()))).slice(0, 20)
  if (unique.length) {
    await upsertSkillNames(unique)
  }
  return await Skill.find().lean()
}

async function main() {
  await mongoose.connect(mongoUri, { dbName })
  console.log(`[seed] Connected to MongoDB ${mongoUri}/${dbName}`)

  const [opportunitiesRaw, skillsRaw] = await Promise.all([
    Opportunity.find().populate('owner').lean(),
    Skill.find().lean()
  ])

  const kafkaMessages = await tryConsumeKafka()
  const corpus = kafkaMessages.length
    ? kafkaMessages
    : opportunitiesRaw.map(o => `${o.title || ''}. ${o.description || ''}`).filter(Boolean)
  const sentencesPool = corpus.flatMap(sentencesFromText).filter(Boolean)

  // Ensure we have a healthy skills pool
  const skills = await ensureSkillPool(skillsRaw, opportunitiesRaw, kafkaMessages)
  const skillIds = skills.map(s => s._id)
  console.log(`[seed] Skills available: ${skills.length}`)

  // Build company name pool from existing data (avoid hardcoded)
  const companyNames = Array.from(new Set([
    ...opportunitiesRaw.map(o => o.owner && o.owner.companyName).filter(Boolean),
  ]))

  // ---------- Create Employers ----------
  const employerCreds = []
  for (let i = 0; i < EMPLOYER_COUNT; i += 1) {
    try {
      const base = companyNames[i % Math.max(1, companyNames.length)] || `seed-co-${i+1}`
      const companySlug = slugify(base)
      const email = `${companySlug || 'company'}-${Date.now().toString(36)}@example.com`
      const passwordPlain = `HireMe!${(1000 + i)}${randomUUID().slice(0, 4)}`
      const passwordHash = await bcrypt.hash(passwordPlain, 10)

      const user = await User.create({
        email,
        password: passwordHash,
        role: 'employer',
        isEmployer: true,
        hasCompletedOnboarding: true
      })

      const urls = buildRandomUrls(companySlug, companySlug)
      const profile = {
        userId: user._id,
        fullName: base,
        companyName: base,
        companyWebsite: urls.companySite
      }
      await EmployerProfile.updateOne({ userId: user._id }, { $set: profile }, { upsert: true })
      employerCreds.push({ email, password: passwordPlain, company: base })
      console.log(`[seed] Employer created: ${email} (${base})`)
    } catch (e) {
      console.warn('[seed] employer create failed:', e && e.message)
    }
  }

  // ---------- Create Students ----------
  const studentCreds = []
  for (let i = 0; i < STUDENT_COUNT; i += 1) {
    try {
      const baseName = `Seed Student ${i + 1}`
      const emailUser = slugify(baseName) || `student-${i+1}`
      const email = `${emailUser}-${Date.now().toString(36)}@example.com`
      const passwordPlain = `Passw0rd!${(1000 + i)}${randomUUID().slice(0, 4)}`
      const passwordHash = await bcrypt.hash(passwordPlain, 10)

      const user = await User.create({
        email,
        password: passwordHash,
        role: 'student',
        isStudent: true,
        hasCompletedOnboarding: true
      })

      const username = await generateUniqueUsername(baseName)
      const urls = buildRandomUrls(username, username)
      const pickedSkills = sampleArray(skillIds, Math.min(8, skillIds.length))

      // experience from opportunities
      const sampleOpps = sampleArray(opportunitiesRaw, 2)
      const experience = sampleOpps.slice(0,1).map(o => ({
        title: o.title || 'Intern',
        company: (o.owner && o.owner.companyName) || slugify(o.owner?.email?.split('@')[1] || 'company').replace(/-/g,' ').toUpperCase(),
        startDate: new Date(Date.now() - 90*24*3600*1000).toISOString(),
        endDate: null,
        description: (o.description || '').slice(0, 300)
      }))
      const education = [{
        institution: `University of ${slugify(username).split('-')[0] || 'Learning'}`,
        degree: 'B.S.',
        fieldOfStudy: 'Computer Science',
        startDate: new Date(Date.now() - 3*365*24*3600*1000).toISOString(),
        endDate: new Date(Date.now() + 365*24*3600*1000).toISOString(),
      }]

      const profile = {
        userId: user._id,
        fullName: baseName,
        username,
        profilePictureUrl: urls.avatar,
        location: 'Remote',
        headline: pickHeadline(sentencesPool),
        bio: pickBio(sentencesPool),
        links: { portfolio: urls.portfolio, github: urls.github, linkedin: urls.linkedin },
        college: education[0].institution,
        graduationYear: new Date(education[0].endDate).getFullYear(),
        major: education[0].fieldOfStudy,
        skills: pickedSkills,
        experience,
        education,
        preferences: {
          jobSearchStatus: Math.random() < 0.5 ? 'OPEN_TO_OPPORTUNITIES' : 'ACTIVELY_APPLYING',
          primaryRole: 'Software Engineer',
          openToRoles: ['Frontend', 'Backend', 'Fullstack'].slice(0, 1 + Math.floor(Math.random() * 3)),
          salaryExpectation: 60000 + Math.floor(Math.random() * 60000)
        },
        visibility: 'PUBLIC'
      }

      await StudentProfile.updateOne({ userId: user._id }, { $set: profile }, { upsert: true })
      studentCreds.push({ email, password: passwordPlain, username })
      console.log(`[seed] Student created: ${email} (@${username})`)
    } catch (e) {
      console.warn('[seed] student create failed:', e && e.message)
    }
  }

  console.log('\n=== Created Employer Accounts ===')
  for (const e of employerCreds) console.log(`- ${e.email} | ${e.password} | ${e.company}`)
  console.log('\n=== Created Student Accounts ===')
  for (const s of studentCreds) console.log(`- ${s.email} | ${s.password} | @${s.username}`)

  await mongoose.disconnect()
  console.log('[seed] Done.')
  process.exit(0)
}

main().catch(err => { console.error('[seed] Failed:', err && err.message); process.exit(1) })
