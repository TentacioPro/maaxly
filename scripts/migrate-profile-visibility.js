#!/usr/bin/env node
const mongoose = require('mongoose')
const Profile = require('../server/models/Profile').default || require('../server/models/Profile')

const MONGO = process.env.MONGO_URL || 'mongodb://localhost:27017/maaxly'

async function run() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  console.log('Connected to DB')
  const profiles = await Profile.find({}).exec()
  let updated = 0
  for (const p of profiles) {
    const vis = p.visibility || {}
    const needs = {}
    if (vis.displayName === undefined) needs['visibility.displayName'] = true
    if (vis.fullName === undefined) needs['visibility.fullName'] = false
    if (vis.email === undefined) needs['visibility.email'] = false
    if (vis.title === undefined) needs['visibility.title'] = false
    if (vis.bio === undefined) needs['visibility.bio'] = false
    if (vis.avatarUrl === undefined) needs['visibility.avatarUrl'] = true
    if (Object.keys(needs).length) {
      await Profile.updateOne({ _id: p._id }, { $set: needs }).exec()
      updated++
    }
  }
  console.log('Migration complete. Profiles updated:', updated)
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
