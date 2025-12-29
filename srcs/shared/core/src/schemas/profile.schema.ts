import { z } from 'zod';
import { idSchema, usernameSchema } from './base.schema.js';

export const UsernameParams = z.object({
  username: usernameSchema,
});

export const ProfileData = z.object({
  id: idSchema,
  authId: z.number(),
  createdAt: z.date(),
  email: z.string().nullable(), // Prisma returns null, not undefined
  username: z.string(),
  avatarUrl: z.string().nullable(), // Prisma returns null, not undefined
});

export const Profile = z.object({
  username: usernameSchema,
  avatarUrl: z.string().nullable(),
});

export const ProfileCreateIn = z.object({
  authId: idSchema,
  username: usernameSchema,
  email: z.string().email().optional(), // API accepts undefined
  avatarUrl: z.string().optional(), // API accepts undefined
});

// inferred DTOs
export type ProfileDTO = z.output<typeof Profile>;
export type ProfileCreateInDTO = z.output<typeof ProfileCreateIn>;
export type UsernameParamsDTO = z.output<typeof UsernameParams>;
