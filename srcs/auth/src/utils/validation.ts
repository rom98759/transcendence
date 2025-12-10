import { z } from 'zod'

// Validation centralisée avec règles métier Transcendence
export const ValidationSchemas = {
  // Auth schemas
  register: z.object({
    username: z
      .string()
      .min(4, 'Username must be at least 4 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username must contain only letters, numbers and underscores')
      .refine((val: string) => !val.includes('admin'), {
        message: "Username cannot contain 'admin'",
      }),

    email: z.string().email('Invalid email format').max(100, 'Email too long'),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password too long')
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
