import { ProfileAuthDTO } from '@transcendence/core';
import { createContext, useContext, useMemo, useState } from 'react';
import { AuthContextType, AuthProviderProps } from '../../types/react-types';

// from https://dev.to/joodi/useauth-hook-in-react-1bp3

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<ProfileAuthDTO | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const login = (user: ProfileAuthDTO) => {
    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateUser = (newUser: ProfileAuthDTO) => {
    setUser((prevUser) => {
      const updated = { ...prevUser, ...newUser };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated as ProfileAuthDTO;
    });
  };

  // memoize to avoid re-render
  const contextValue = useMemo(
    () => ({
      user,
      login,
      logout,
      updateUser,
    }),
    [user],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const isLoggedIn = Boolean(context.user);

  return { ...context, isLoggedIn };
};
