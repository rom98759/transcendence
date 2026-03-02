import { ProfileSimpleDTO } from '@transcendence/core';
import { ReactNode } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface UserAction {
  label: string;
  color?: string;
  icon: string;
}

export enum UserActions {
  PLAY = 'play',
  ADD = 'add',
  REMOVE = 'remove',
  CHANGE = 'change',
}

export enum MenuActions {
  HOME = 'home',
  PLAY = 'play',
  STATS = 'stats',
  PROFILE = 'profile',
}

export enum Roles {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export interface AuthContextType {
  user: ProfileSimpleDTO | null;
  isLoggedIn: boolean;
  isAuthChecked: boolean;
  login: (user: ProfileSimpleDTO) => void;
  logout: () => void;
  updateUser: (newUser: ProfileSimpleDTO) => void;
  markAnimAsSeen: () => void;
  hasSeenAnim: boolean;
  pending2FA: import('./twoFactor.types').TwoFactorPendingContext | null;
  /** true si pending2FA existe et n'est pas expiré */
  hasPending2FA: boolean;
  setPending2FA: (ctx: import('./twoFactor.types').TwoFactorPendingContext) => void;
  clearPending2FA: () => void;
}

export interface AuthProviderProps {
  children: ReactNode;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
}
