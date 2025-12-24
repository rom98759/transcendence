import Fastify from 'fastify'
import { registerPlugins } from './plugins/index.js'
import { registerRoutes } from './module/block.routes.js'
import { registerErrorHandler } from './core/error-handler.js'

// export async function buildApp() {
  const app = Fastify({
    logger: true,
  })

  await registerPlugins(app)
  registerErrorHandler(app)
  await registerRoutes(app)

  export default app
  // return app
// }
