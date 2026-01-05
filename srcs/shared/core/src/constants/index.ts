export enum RequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export const CONFIG = {
  MAX_FRIENDS: 10,
} as const;

export * from './services.const.js';
