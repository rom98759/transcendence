import { z } from 'zod'
import { RESERVED_USERNAMES, AUTH_CONFIG } from './constants.js'

// Validation centralisée avec règles métier Transcendence
export const ValidationSchemas = {
  // Auth schemas
  register: z.object({
    username: z
      .string()
      .min(
        AUTH_CONFIG.USERNAME_MIN_LENGTH,
        `Username must be at least ${AUTH_CONFIG.USERNAME_MIN_LENGTH} characters`,
      )
      .max(
        AUTH_CONFIG.USERNAME_MAX_LENGTH,
        `Username must be at most ${AUTH_CONFIG.USERNAME_MAX_LENGTH} characters`,
      )
      .regex(
        AUTH_CONFIG.USERNAME_PATTERN,
        'Username must contain only letters, numbers and underscores',
      )
      .refine((val: string) => !RESERVED_USERNAMES.includes(val.toLowerCase()), {
        message: 'This username is reserved and cannot be used',
      }),

    email: z
      .string()
      .email('Invalid email format')
      .max(AUTH_CONFIG.EMAIL_MAX_LENGTH, 'Email too long'),

    password: z
      .string()
      .min(
        AUTH_CONFIG.PASSWORD_MIN_LENGTH,
        `Password must be at least ${AUTH_CONFIG.PASSWORD_MIN_LENGTH} characters`,
      )
      .max(AUTH_CONFIG.PASSWORD_MAX_LENGTH, 'Password too long')
      .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
      .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
      .regex(/^(?=.*\d)/, 'Password must contain at least one number')
      .regex(
        /^(?=.*[!@#$%^&*])/,
        'Password must contain at least one special character (!@#$%^&*)',
      ),
  }),

  login: z
    .object({
      username: z.string().min(1).optional(),
      email: z.string().email().optional(),
      password: z.string().min(1, 'Password required'),
    })
    .refine((data: { username?: string; email?: string }) => data.username || data.email, {
      message: 'Either username or email must be provided',
      path: ['username'],
    }),
}

// Helper pour validation avec log d'erreurs
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): {
  success: boolean
  data?: T
  errors?: z.ZodIssue[]
} {
  const result = schema.safeParse(data)
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues,
    }
  }
  return {
    success: true,
    data: result.data,
  }
}

// Types dérivés automatiquement
export type RegisterInput = z.infer<typeof ValidationSchemas.register>
export type LoginInput = z.infer<typeof ValidationSchemas.login>
