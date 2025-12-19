import fastify from 'fastify'
import { umRoutes as userRoutes } from './routes/um.routes.js'
import { appenv } from './config/env.js'
import { loggerConfig } from './config/logger.config.js'

const app = fastify({
  logger: loggerConfig,
  disableRequestLogging: false,
})

export const logger = app.log

app.register(userRoutes, { prefix: '/' })

app.listen(
  { host: '0.0.0.0', port: appenv.UM_SERVICE_PORT },
  (err: Error | null, address: string) => {
    if (err) {
      app.log.error({ message: err.message })
      process.exit(1)
    }
    app.log.info({ message: `User Management service listening at ${address}` })
  }
)
