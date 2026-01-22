import { ProfileAuthDTO } from '@transcendence/core';
import { AvatarSize } from '../../types/react-types';
import Avatar from '../atoms/Avatar';

/**
 * @todo guards for avatar url format
 */
interface Props {
  user: ProfileAuthDTO;
  avatarSize: AvatarSize;
}

export const UserRow = ({ user, avatarSize }: Props) => {
  return (
    <div className="flex items-center gap-4">
      <Avatar alt="user avatar" size={avatarSize} src={user.avatarUrl}></Avatar>
      <div className="flex flex-col">
        <span className="font-quantico font-bold text-lg">{user.username}</span>
      </div>
    </div>
  );
};
