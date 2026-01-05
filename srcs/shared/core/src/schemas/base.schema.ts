import * as z from 'zod';

// should not be exported out of module
export const usernameSchema = z
  .string()
  .min(4, 'Username must be at least 4 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username must contain only letters, numbers and underscores')
  .refine((val: string) => !val.includes('admin'), {
    message: "Username cannot contain 'admin'",
  });

export const nicknameSchema = z
  .string()
  .min(2, 'Nickname must be at least 2 characters')
  .max(20, 'Nickname must be at most 20 characters');

export const idSchema = z.coerce.number().int().min(1, 'ID must be positive');

export const statusUpdateSchema = z.enum(['ACCEPTED', 'REJECTED']);

// can be exported
export const IdSchema = z.object({
  id: idSchema,
});

export const targetUserIdSchema = z.object({
  targetUserId: idSchema,
});

export type IdDTO = z.output<typeof IdSchema>;
export type targetUserIdDTO = z.output<typeof targetUserIdSchema>;
export type statusUpdateDTO = z.output<typeof statusUpdateSchema>;
