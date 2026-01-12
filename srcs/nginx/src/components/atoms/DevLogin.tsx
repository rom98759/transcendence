import defaultAvatar from '../../assets/avatars/default.png';
import { RoleDTO } from '@transcendence/core';
import { Roles } from '../../types/react-types';
import Button from './Button';
import { useAuth } from '../helpers/AuthProvider';

export const DevLoginButtons = () => {
  const { login, logout } = useAuth();

  const handleFakeLogin = (role: RoleDTO) => {
    const fakeUser = {
      authId: 1,
      username: role === Roles.ADMIN ? 'Admin' : 'Toto',
      role: role,
      avatarUrl: defaultAvatar,
      email: 'test@example.com',
    };
    login(fakeUser);
  };

  return (
    <div className="flex flex-col">
      <Button onClick={() => handleFakeLogin(Roles.USER)}>Fake user</Button>
      <Button onClick={() => handleFakeLogin(Roles.ADMIN)}>Fake admin</Button>
      <Button onClick={() => logout()}>Logout</Button>
    </div>
  );
};
