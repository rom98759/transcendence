import fp from 'fastify-plugin'
import fastifyView from '@fastify/view'
import ejs from 'ejs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const viewsPath = join(__dirname, '../../src/views')

export default fp(async (app) => {
  app.register(fastifyView, {
    engine: { ejs },
    root: viewsPath,
    viewExt: 'ejs',
  })
})
