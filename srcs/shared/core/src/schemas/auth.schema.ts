import z from 'zod';
import { idSchema, passwordSchema, usernameSchema } from './base.schema.js';

export const UserRegisterSchema = z.object({
  username: usernameSchema,
  email: z.email().optional(),
  password: passwordSchema,
});

export const UserSchema = z.object({
  authId: idSchema,
  email: z.email(),
  username: usernameSchema,
});

export const UserLoginSchema = z.object({
  username: usernameSchema.optional(),
  email: z.email().optional(),
  password: z.string(),
});

// inferred DTOs
export type UserDTO = z.output<typeof UserSchema>;
export type UserRegisterDTO = z.output<typeof UserRegisterSchema>;
export type UserLoginDTO = z.output<typeof UserLoginSchema>;
