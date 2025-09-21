import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const client = new Redis(redisUrl)

client.on('error', (err) => console.error('Redis error', err))

export default client
