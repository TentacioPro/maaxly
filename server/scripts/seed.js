import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

import User from '../models/User.js'
import StudentProfile from '../models/StudentProfile.js'
import EmployerProfile from '../models/EmployerProfile.js'
import AdminProfile from '../models/AdminProfile.js'
import Opportunity from '../models/Opportunity.js'
import Application from '../models/Application.js'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB || 'mvp-db'

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr, n = 1) {
  const copy = [...arr]
  const out = []
  while (copy.length && out.length < n) {
    const i = randInt(0, copy.length - 1)
    out.push(copy.splice(i, 1)[0])
  }
  return out
}

const studentNames = [
  'Ava Patel', 'Liam Chen', 'Sophia Garcia', 'Noah Johnson', 'Mia Nguyen',
  'Ethan Brown', 'Isabella Davis', 'Lucas Wilson', 'Amelia Martinez', 'Mason Thompson'
]
const colleges = ['State University', 'Tech Institute', 'Northview College', 'Hillside University']
const majors = ['Computer Science', 'Information Systems', 'Data Science', 'Software Engineering', 'Business Analytics']
const skillsPool = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL',
  'Python', 'Django', 'Flask', 'Docker', 'Git', 'HTML', 'CSS', 'Tailwind CSS'
]

const employerContacts = [
  { name: 'Olivia Reed', company: 'NovaSoft', domain: 'novasoft.io' },
  { name: 'James Carter', company: 'BluePeak Labs', domain: 'bluepeak.dev' },
  { name: 'Charlotte King', company: 'Orion Dynamics', domain: 'oriondyn.com' },
  { name: 'Benjamin Lee', company: 'CedarWorks', domain: 'cedar.works' },
  { name: 'Emily Clark', company: 'Nimbus AI', domain: 'nimbus.ai' },
  { name: 'Henry Turner', company: 'Northstar Systems', domain: 'northstar.systems' },
  { name: 'Avery Collins', company: 'Summitware', domain: 'summitware.co' }
]

const opportunityTitles = [
  { title: 'Software Engineer', type: 'job' },
  { title: 'Frontend Engineer', type: 'job' },
  { title: 'Backend Engineer', type: 'job' },
  { title: 'Data Analyst Intern', type: 'internship' },
  { title: 'Product Intern', type: 'internship' },
  { title: 'Hackathon Challenge', type: 'competition' }
]

async function ensureUser(email, role, flags, hashedPassword) {
  const update = {
    role,
    ...flags,
    hasCompletedOnboarding: true
  }
  const user = await User.findOneAndUpdate(
    { email },
    { $set: update, $setOnInsert: { email, password: hashedPassword } },
    { new: true, upsert: true }
  )
  return user
}

async function seedUsers() {
  const saltRounds = 10
  const hashed = await bcrypt.hash('Password123!', saltRounds)

  // Students
  const students = []
  for (let i = 0; i < studentNames.length; i += 1) {
    const name = studentNames[i]
    const email = `student${i + 1}@example.com`
    const u = await ensureUser(email, 'student', { isStudent: true }, hashed)
    const profile = {
      fullName: name,
      college: colleges[i % colleges.length],
      graduationYear: 2025 + (i % 3),
      major: majors[i % majors.length],
      skills: pick(skillsPool, randInt(3, 5))
    }
    await StudentProfile.updateOne(
      { userId: u._id },
      { $set: { userId: u._id, ...profile } },
      { upsert: true }
    )
    students.push(u)
  }

  // Employers
  const employers = []
  for (let i = 0; i < employerContacts.length; i += 1) {
    const c = employerContacts[i]
    const email = `employer${i + 1}@${c.domain}`
    const u = await ensureUser(email, 'employer', { isEmployer: true }, hashed)
    const profile = {
      fullName: c.name,
      companyName: c.company,
      companyWebsite: `https://${c.domain}`
    }
    await EmployerProfile.updateOne(
      { userId: u._id },
      { $set: { userId: u._id, ...profile } },
      { upsert: true }
    )
    employers.push(u)
  }

  // Admins
  const adminsSpec = [
    { email: 'admin1@example.com', displayName: 'Admin One' },
    { email: 'admin2@example.com', displayName: 'Admin Two' }
  ]
  const admins = []
  for (const a of adminsSpec) {
    const u = await ensureUser(a.email, 'admin', { isAdmin: true }, hashed)
    await AdminProfile.updateOne(
      { userId: u._id },
      { $set: { userId: u._id, displayName: a.displayName, title: 'Administrator' } },
      { upsert: true }
    )
    admins.push(u)
  }

  return { students, employers, admins }
}

function isoDate(daysFromNow) {
  const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

async function seedOpportunities(employers) {
  const locations = ['Remote', 'New York, NY', 'San Francisco, CA', 'Austin, TX', 'Seattle, WA']
  const created = []
  for (const owner of employers) {
    // 2-3 listings per employer
    const count = randInt(2, 3)
    const chosen = pick(opportunityTitles, count)
    for (const spec of chosen) {
      const title = `${spec.title} @ ${owner._id.toString().slice(-4)}`
      const filter = { owner: owner._id, title }
      const opp = await Opportunity.findOneAndUpdate(
        filter,
        {
          $set: {
            description: `Join our team as a ${spec.title}. Work on impactful projects with a collaborative team.`,
            type: spec.type,
            owner: owner._id,
            skillset: pick(skillsPool, randInt(3, 5)).join(', '),
            requirements: 'Strong problem-solving skills; team player; eagerness to learn.',
            applicationDeadline: isoDate(randInt(15, 60)),
            location: locations[randInt(0, locations.length - 1)],
            contactEmail: (await EmployerProfile.findOne({ userId: owner._id }).lean())?.companyWebsite?.replace('https://', 'jobs@') || 'jobs@example.com',
            contactPhone: '+1-555-0100'
          }
        },
        { new: true, upsert: true }
      )
      created.push(opp)
    }
  }
  return created
}

async function seedApplications(students, opportunities) {
  let created = 0
  for (const student of students) {
    const appCount = randInt(2, 4)
    const opps = pick(opportunities, Math.min(appCount, opportunities.length))
    for (const opp of opps) {
      const filter = { opportunity: opp._id, applicant: student._id }
      const statusList = ['applied', 'screening', 'interview']
      const status = statusList[randInt(0, statusList.length - 1)]
      const doc = await Application.findOneAndUpdate(
        filter,
        {
          $setOnInsert: {
            coverLetter: 'Looking forward to contributing to your team!',
            status,
            history: [{ status: 'applied', at: new Date() }, ...(status !== 'applied' ? [{ status, at: new Date() }] : [])]
          }
        },
        { upsert: true, new: true }
      )
      if (doc.wasNew) created += 1
    }
  }
  // Recalculate applicationsCount per opportunity
  const byOpp = await Application.aggregate([
    { $group: { _id: '$opportunity', count: { $sum: 1 } } }
  ])
  for (const row of byOpp) {
    await Opportunity.findByIdAndUpdate(row._id, { $set: { applicationsCount: row.count } })
  }
  return created
}

async function seedConversations(students, employers) {
  // Create light sample conversations/messages: one per first 5 students with a random employer
  const sampleCount = Math.min(5, students.length)
  for (let i = 0; i < sampleCount; i += 1) {
    const student = students[i]
    const employer = employers[randInt(0, employers.length - 1)]

    // Deterministic filter to avoid dupes on re-run
    const filter = { 'participants.user': { $all: [student._id, employer._id] } }
    let convo = await Conversation.findOne(filter)
    if (!convo) {
      convo = new Conversation({ participants: [{ user: student._id }, { user: employer._id }] })
      await convo.save()
    }

    // Seed a few messages if less than 2 exist
    const existingCount = await Message.countDocuments({ conversation: convo._id })
    if (existingCount < 2) {
      const msgs = [
        { sender: student._id, text: 'Hello! I am interested in your listing.' },
        { sender: employer._id, text: 'Thanks for reaching out! Can you share your resume?' },
        { sender: student._id, text: 'Sure, I have attached it in my profile.' }
      ]
      let last
      for (const m of msgs) {
        // eslint-disable-next-line no-await-in-loop
        last = await Message.create({ conversation: convo._id, sender: m.sender, text: m.text, readBy: [m.sender] })
      }
      await Conversation.findByIdAndUpdate(convo._id, { $set: { lastMessage: last._id } })
    }
  }
}

async function main() {
  await mongoose.connect(mongoUri, { dbName })
  console.log(`Connected to MongoDB at ${mongoUri}, db '${dbName}'`)

  const { students, employers, admins } = await seedUsers()
  console.log(`Upserted users: ${students.length} students, ${employers.length} employers, ${admins.length} admins`)

  const opportunities = await seedOpportunities(employers)
  console.log(`Upserted opportunities: ${opportunities.length}`)

  await seedApplications(students, opportunities)
  const appCount = await Application.countDocuments()
  console.log(`Applications total: ${appCount}`)

  await seedConversations(students, employers)
  const convoCount = await Conversation.countDocuments()
  const msgCount = await Message.countDocuments()
  console.log(`Conversations: ${convoCount}, Messages: ${msgCount}`)

  await mongoose.disconnect()
  console.log('Seeding complete.')
}

main().catch(err => { console.error(err); process.exit(1) })
