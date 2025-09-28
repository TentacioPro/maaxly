import mongoose from 'mongoose'
import StudentProfile from '../models/StudentProfile.js'
import Skill from '../models/Skill.js'
import User from '../models/User.js'

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB || 'mvp-db'
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile'

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
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await StudentProfile.findOne({ username: candidate }).select('_id').lean()
    if (!exists) return candidate
    n += 1
    candidate = `${baseSlug}-${n}`
  }
}

async function aiStudentProfile(name, major) {
  if (!GROQ_API_KEY) return null
  const prompt = `Create a concise student profile as strict JSON with keys: fullName, headline, bio, skills (8-14 items), links { portfolio, github, linkedin }. The student is ${name}, majoring in ${major}. Keep bio 80-120 words. Avoid placeholders.`
  try {
    let content = ''
    try {
      const { default: Groq } = await import('groq-sdk')
      const client = new Groq({ apiKey: GROQ_API_KEY })
      const completion = await client.chat.completions.create({
        model: GROQ_MODEL,
        temperature: 0.7,
        messages: [
          { role: 'system', content: 'Output strict JSON only.' },
          { role: 'user', content: prompt }
        ]
      })
      content = completion?.choices?.[0]?.message?.content || ''
    } catch (sdkErr) {
      const f = typeof fetch === 'function' ? fetch : (await import('node-fetch')).default
      const res = await f('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.7,
          messages: [
            { role: 'system', content: 'Output strict JSON only.' },
            { role: 'user', content: prompt }
          ]
        })
      })
      if (!res.ok) return null
      const data = await res.json()
      content = data?.choices?.[0]?.message?.content || ''
    }
    const cleaned = content.trim().replace(/^```json\n?|```$/g, '')
    const j = JSON.parse(cleaned)
    return j
  } catch (e) {
    console.warn('[groq] student profile generation failed', e && e.message)
    return null
  }
}

async function upsertSkillNames(names) {
  const ids = []
  for (const s of (names || [])) {
    const name = s.toString().trim()
    if (!name) continue
    // eslint-disable-next-line no-await-in-loop
    const doc = await Skill.findOneAndUpdate(
      { nameLower: name.toLowerCase() },
      { $setOnInsert: { name, nameLower: name.toLowerCase() } },
      { upsert: true, new: true }
    )
    ids.push(doc._id)
  }
  return ids
}

async function main() {
  await mongoose.connect(mongoUri, { dbName })
  console.log(`Connected to MongoDB at ${mongoUri}, db '${dbName}'`)

  const candidates = [
    { email: 'ai-student1@example.com', name: 'Kai Nakamura', major: 'Computer Science' },
    { email: 'ai-student2@example.com', name: 'Amelia Martinez', major: 'Software Engineering' },
    { email: 'ai-student3@example.com', name: 'Priya Iyer', major: 'Data Science' }
  ]

  for (const c of candidates) {
    const username = await generateUniqueUsername(c.name)
    const ai = await aiStudentProfile(c.name, c.major)
    const fullName = ai?.fullName || c.name
    const profile = {
      fullName,
      headline: ai?.headline || `${c.major} Student`,
      bio: ai?.bio || '',
      links: {
        portfolio: ai?.links?.portfolio || '',
        github: ai?.links?.github || '',
        linkedin: ai?.links?.linkedin || ''
      }
    }

    const user = await User.findOneAndUpdate(
      { email: c.email },
      { $set: { email: c.email, role: 'student', isStudent: true, hasCompletedOnboarding: true }, $setOnInsert: { password: '$2a$10$placeholderhashhashhashhashhashhashhash' } },
      { upsert: true, new: true }
    )

    let skillIds = []
    if (ai?.skills?.length) {
      skillIds = await upsertSkillNames(ai.skills)
    }

    const publicId = (Date.now().toString(36) + Math.random().toString(36).slice(2,8))
    await StudentProfile.updateOne(
      { userId: user._id },
      { $set: { userId: user._id, ...profile, major: c.major, college: 'AI University', graduationYear: 2026, skills: skillIds }, $setOnInsert: { username, publicId } },
      { upsert: true }
    )
    console.log(`[seed-ai] upserted ${fullName}`)
  }

  await mongoose.disconnect()
  console.log('AI student seeding complete.')
}

main().catch(err => { console.error(err); process.exit(1) })
