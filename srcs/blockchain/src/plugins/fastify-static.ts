import fastifyStatic from '@fastify/static'
import fp from 'fastify-plugin'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const publicPath = join(__dirname, '../../src/public')

export default fp(async (app) => {
  app.register(fastifyStatic, {
    root: publicPath,
    prefix: "/",
  })
})
