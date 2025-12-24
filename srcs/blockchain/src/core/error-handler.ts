import { RecordNotFoundError } from './error.js'
import { FastifyInstance } from 'fastify'
import type { FastifyError } from '@fastify/error'

type ValidationErrorLike = FastifyError & {
  validation?: unknown
  validationContext?: string
  code?: string
}

function isValidationError(err: unknown): err is ValidationErrorLike {
  return (
    typeof err === 'object' &&
    err !== null &&
    'validation' in err &&
    Array.isArray((err as any).validation)
  )
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _req, res) => {
    if (error instanceof RecordNotFoundError) {
      res.statusCode = 404
      return res.view('404', { error: error.message })
    }
    if (isValidationError(error)) {
      return res.status(400).send({
        code: error.code ?? 'FST_ERR_VALIDATION',
        validation: error.validation,
        validationContext: error.validationContext ?? 'body',
      })
    }
    app.log.error(error)
    return res.status(500).send({
      error: error instanceof Error ? error.message : 'Internal Server Error',
    })
  })
}
