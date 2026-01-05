import z from 'zod';
import { usernameSchema } from './base.schema.js';

export const UserNameSchema = z.object({
  username: usernameSchema,
});

export interface UserRequestDTO {
  id: number;
  username: string;
  role?: string;
  email?: string;
}

export type UserNameDTO = z.output<typeof UserNameSchema>;
