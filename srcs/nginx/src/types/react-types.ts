import { ProfileAuthDTO } from '@transcendence/core';
import { ReactNode } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';

export enum MenuActions {
  HOME = 'home',
  PLAY = 'play',
  STATS = 'stats',
}

export enum Roles {
  GUEST = 'GUEST',
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface AuthContextType {
  user: ProfileAuthDTO | null;
  login: (user: ProfileAuthDTO) => void;
  logout: () => void;
  updateUser: (newUser: ProfileAuthDTO) => void;
}

export interface AuthProviderProps {
  children: ReactNode;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
}
