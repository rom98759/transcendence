import { z } from 'zod';
import { idSchema, nicknameSchema, statusUpdateSchema } from './base.schema.js';
import { ProfileSchema } from './profile.schema.js';

export const FriendshipFullSchema = z.object({
  id: idSchema,
  status: z.string(),
  nicknameRequester: nicknameSchema.nullable(),
  nicknameReceiver: nicknameSchema.nullable(),
  requester: ProfileSchema,
  receiver: ProfileSchema,
});

export const FriendshipUnifiedSchema = z.object({
  id: idSchema,
  status: z.string(),
  nickname: nicknameSchema.nullable(),
  friend: ProfileSchema,
});

export const FriendshipReceiverSchema = FriendshipFullSchema.omit({
  requester: true,
  nicknameRequester: true,
});

export const FriendshipRequesterSchema = FriendshipFullSchema.omit({
  receiver: true,
  nicknameReceiver: true,
});

export const FriendshipUpdateStatusSchema = z.object({
  status: statusUpdateSchema,
});

export const FriendshipUpdateNicknameSchema = z.object({
  nickname: nicknameSchema,
});

// inferred DTOs
export type FriendshipFullDTO = z.output<typeof FriendshipFullSchema>;
export type FriendshipUnifiedDTO = z.output<typeof FriendshipUnifiedSchema>;
export type FriendshipReceiverDTO = z.output<typeof FriendshipReceiverSchema>;
export type FriendshipRequesterDTO = z.output<typeof FriendshipRequesterSchema>;
export type FriendshipUpdateStatusDTO = z.output<typeof FriendshipUpdateStatusSchema>;
export type FriendshipUpdateNicknameDTO = z.output<typeof FriendshipUpdateNicknameSchema>;
