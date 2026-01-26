import { z } from 'zod';
import { idSchema, usernameSchema } from './base.schema.js';
import { UserDTO } from './auth.schema.js';

export const ProfileCreateInSchema = z.object({
  authId: idSchema,
  username: usernameSchema,
  email: z.email().optional(), // API accepts undefined
  avatarUrl: z.string().optional(), // API accepts undefined
});

export const ProfileDataSchema = z.object({
  id: idSchema,
  authId: idSchema,
  createdAt: z.date(),
  email: z.string().nullable(), // Prisma returns null, not undefined
  username: z.string(),
  avatarUrl: z.string().nullable(), // Prisma returns null, not undefined
});

export const ProfileSimpleSchema = z.object({
  username: usernameSchema,
  avatarUrl: z.string().nullable(),
});

export const ProfileSchema = ProfileSimpleSchema.extend({
  authId: idSchema,
});

// inferred DTOs
export type ProfileCreateInDTO = z.output<typeof ProfileCreateInSchema>;
export type ProfileDataDTO = z.output<typeof ProfileDataSchema>;
export type ProfileSimpleDTO = z.output<typeof ProfileSimpleSchema>;
export type ProfileDTO = z.output<typeof ProfileSchema>;
export type ProfileStoredDTO = UserDTO & ProfileDTO & { token: string };
export type ProfileAuthDTO = UserDTO & ProfileDTO;
