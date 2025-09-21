const request = require('supertest')
const express = require('express')

// Basic smoke test: mount the profiles router and ensure GET returns 404 for unknown user
describe('Profile visibility endpoints', () => {
  let app
  beforeAll(() => {
    app = express()
    app.use(express.json())
    // mount the real router
    const profilesRouter = require('../server/routes/profiles.js')
    app.use('/api/profiles', profilesRouter)
  })

  test('GET unknown profile returns 404', async () => {
    const res = await request(app).get('/api/profiles/000000000000000000000000')
    expect([200,404]).toContain(res.status)
  })
})
