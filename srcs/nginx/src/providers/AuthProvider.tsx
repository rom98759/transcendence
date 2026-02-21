import { ProfileSimpleDTO } from '@transcendence/core';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContextType, AuthProviderProps } from '../types/react-types';
import { authApi } from '../api/auth-api';

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<ProfileSimpleDTO | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  /**
   * Vérifie la session courante via l'API /me
   * Retourne true si authentifié, false sinon.
   * Exposée dans le contexte pour être rappelée après un login OAuth.
   */
  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const me = await authApi.me();
      const profile: ProfileSimpleDTO = {
        username: me.username,
        avatarUrl: null,
      };
      setUser(profile);
      return true;
    } catch {
      setUser(null);
      return false;
    } finally {
      setIsAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback((user: ProfileSimpleDTO) => {
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
  }, []);

  const updateUser = useCallback((newUser: ProfileSimpleDTO) => {
    setUser((prev) => (prev ? { ...prev, ...newUser } : prev));
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      isAuthChecked,
      isLoggedIn: isAuthChecked && user !== null,
      login,
      logout,
      updateUser,
      checkAuth,
    }),
    [user, isAuthChecked, checkAuth, login, logout, updateUser],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
