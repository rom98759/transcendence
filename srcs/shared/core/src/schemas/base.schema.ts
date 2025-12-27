import * as z from 'zod';

export const usernameSchema = z
  .string()
  .min(4, 'Username must be at least 4 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username must contain only letters, numbers and underscores')
  .refine((val: string) => !val.includes('admin'), {
    message: "Username cannot contain 'admin'",
  });

export const idSchema = z.number().min(1, 'ID should be above or equal to 1');
