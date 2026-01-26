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

export const UserLoginSchema = UserRegisterSchema.pick({ password: true })
  .extend({
    username: usernameSchema.optional(),
    email: z.email().optional(),
  })
  .refine((data) => data.username || data.email, {
    message: 'You must provide either a username, either an email',
    path: ['username'],
  });

// inferred DTOs
export type UserDTO = z.output<typeof UserSchema>;
export type UserRegisterDTO = z.output<typeof UserRegisterSchema>;
export type UserLoginDTO = z.output<typeof UserLoginSchema>;
