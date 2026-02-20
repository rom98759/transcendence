import { ProfileSimpleDTO } from '@transcendence/core';
import { ReactNode } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';

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
  checkAuth: () => Promise<void>;
}

export interface AuthProviderProps {
  children: ReactNode;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
}
