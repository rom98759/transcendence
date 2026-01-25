import { ProfileSimpleDTO } from '@transcendence/core';
import { ReactNode } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';

export enum MenuActions {
  HOME = 'home',
  PLAY = 'play',
  STATS = 'stats',
}

export enum Roles {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface AuthContextType {
  user: ProfileSimpleDTO | null;
  login: (user: ProfileSimpleDTO) => void;
  logout: () => void;
  updateUser: (newUser: ProfileSimpleDTO) => void;
}

export interface AuthProviderProps {
  children: ReactNode;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
}
