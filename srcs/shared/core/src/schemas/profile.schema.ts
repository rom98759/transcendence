import { z } from 'zod';
import { idSchema, usernameSchema } from './base.schema.js';

export const UsernameSchema = z.object({
  username: usernameSchema,
});

export const UserCreateSchema = z.object({
  authId: idSchema,
  email: z.email(),
  username: usernameSchema,
});

export const UserProfileSchema = z.object({
  username: usernameSchema,
  avatarUrl: z.url().nullable().optional(),
});

// inferred DTOs
export type UsernameDTO = z.infer<typeof UsernameSchema>;
export type UserCreateDTO = z.infer<typeof UserCreateSchema>;
export type UserProfileDTO = z.infer<typeof UserProfileSchema>;