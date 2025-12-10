import Fastify from 'fastify'
import Redis from 'ioredis'
import Database from 'better-sqlite3'

const redisHost = process.env.REDIS_HOST || 'redis-broker'
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10)

let redisPub

// Check and wait for redis without restarting
async function connectRedis(retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      redisPub = new Redis({ host: redisHost, port: redisPort })

      // Test connection
      await redisPub.ping()
      console.log('✅ Redis connected')
      return redisPub
    } catch (err) {
      console.warn(`Redis connection failed (${i + 1}/${retries}): ${err.message}`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  // After retries, fall back to a "disconnected" mode
  console.error('⚠️ Could not connect to Redis. Running in degraded mode.')
  redisPub = new Redis({ host: redisHost, port: redisPort, retryStrategy: (times) => 2000 })
  return redisPub
}

await connectRedis()

const redisSub = new Redis({ host: process.env.REDIS_HOST || 'redis-broker' })

// Subscribe to user requests
const db = new Database('./data/users.db')

const fastify = Fastify({ logger: true })

await redisSub.subscribe('user_requests')

redisSub.on('message', async (channel, message) => {
  const msg = JSON.parse(message)

  if (msg.action === 'get_users') {
    const users = db.prepare('SELECT id, username FROM users').all()
    await redisPub.publish(msg.replyChannel, JSON.stringify(users))
  }

  // ✅ Handle broker-based health check
  if (msg.action === 'health_check') {
    const health = {
      status: 'healthy',
      service: 'users-management',
      timestamp: new Date().toISOString(),
    }

    try {
      db.prepare('SELECT 1').get()
      health.database = 'connected'
    } catch (err) {
      health.status = 'unhealthy'
      health.error = err.message
    }

    await redisPub.publish(msg.replyChannel, JSON.stringify(health))
  }
})

// No need to listen -> No http access.
// fastify.listen({ port: 3001, host: '0.0.0.0' });
