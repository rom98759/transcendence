import { Prisma } from '@prisma/client';

export type FriendshipWithProfiles = Prisma.FriendshipGetPayload<{
  include: { requester: true; receiver: true };
}>;
