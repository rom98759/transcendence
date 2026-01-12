import { ProfileAuthDTO, UserDTO } from '@transcendence/core';
import { ReactNode } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';

export enum MenuActions {
  HOME = 'home',
  PLAY = 'play',
  PROFILE = 'profile',
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
}

export interface AuthProviderProps {
  children: ReactNode;
}
