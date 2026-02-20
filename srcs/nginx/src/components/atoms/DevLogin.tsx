import { RoleDTO } from '@transcendence/core';
import { Roles } from '../../types/react-types';
import Button from './Button';
import { authApi } from '../../api/auth-api';
import { profileApi } from '../../api/profile-api';
import { useAuth } from '../../providers/AuthProvider';

export const DevLoginButtons = () => {
  const { login, logout } = useAuth();

  const handleDevLogin = async (role: RoleDTO) => {
    try {
      const username = role === Roles.ADMIN ? 'Admin' : 'Toto';
      const credentials = {
        password: 'Password123!',
        username: username,
      };
      const result = await authApi.login(credentials);

      // Type guard pour gérer la 2FA
      if ('require2FA' in result && result.require2FA) {
        console.warn('2FA required for dev login - skipping in dev mode');
        return;
      }

      // Ici TypeScript sait que result est { username: string }
      const loggedUsername = result.username;

      if (!loggedUsername) return;
      const profile = await profileApi.getMe(loggedUsername);
      const fullProfile = {
        ...profile,
        email: 'test@mail.com',
      };
      login(fullProfile);
    } catch (error) {
      console.error(`Login error:`, error);
    }
  };

  const handleDevRegister = (role: RoleDTO) => {
    try {
      const username = role === Roles.ADMIN ? 'Admin' : 'Toto';
      const credentials = {
        password: 'Password123!',
        username: username,
        email: 'test@mail.com',
      };
      const response = authApi.register(credentials);
      console.log(`Regster success for ${response}`);
    } catch (error) {
      console.error(`Login error:`, error);
    }
  };

  return (
    <div className="flex flex-col">
      <Button onClick={() => handleDevRegister(Roles.USER)}>Register user</Button>
      <Button onClick={() => handleDevRegister(Roles.ADMIN)}>Register admin</Button>
      <Button onClick={() => handleDevLogin(Roles.USER)}>Login user</Button>
      <Button onClick={() => handleDevLogin(Roles.ADMIN)}>Login admin</Button>
      <Button onClick={() => logout()}>Logout</Button>
    </div>
  );
};
