import { z } from 'zod';
import { idSchema, usernameSchema } from './base.schema.js';

export const ProfileCreateInSchema = z.object({
  authId: idSchema,
  username: usernameSchema,
  email: z.string().email().optional(), // API accepts undefined
  avatarUrl: z.string().optional(), // API accepts undefined
});

export const ProfileDataSchema = z.object({
  id: idSchema,
  authId: idSchema,
  createdAt: z.date(),
  email: z.string().nullable(), // Prisma returns null, not undefined
  username: z.string(),
  avatarUrl: z.string().optional(), // Prisma returns null, not undefined
});

export const ProfileSchema = z.object({
  authId: idSchema,
  username: usernameSchema,
  avatarUrl: z.string().nullable(),
});

// inferred DTOs
export type ProfileCreateInDTO = z.output<typeof ProfileCreateInSchema>;
export type ProfileDataDTO = z.output<typeof ProfileDataSchema>;
export type ProfileDTO = z.output<typeof ProfileSchema>;
