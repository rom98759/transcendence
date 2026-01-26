import { RoleDTO } from '@transcendence/core';
import { Roles } from '../../types/react-types';
import Button from './Button';
import { useAuth } from '../helpers/AuthProvider';
import { authApi } from '../../api/auth-api';
import { profileApi } from '../../api/profile-api';

export const DevLoginButtons = () => {
  const { login, logout } = useAuth();

  const handleDevLogin = async (role: RoleDTO) => {
    try {
      const username = role === Roles.ADMIN ? 'Admin' : 'Toto';
      const credentials = {
        password: 'Password123!',
        username: username,
      };
      const loggedUsername = await authApi.login(credentials);
      // console.log(`dev login logged username = ${loggedUsername}`);

      if (!loggedUsername) return;
      const profile = await profileApi.getMe(loggedUsername);
      // console.log(`dev login full profile = ${profile}`);
      const fullProfile = {
        ...profile,
        email: 'test@mail.com',
      };
      login(fullProfile);
      // console.log('Login success with real data:', fullProfile.avatarUrl);
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
