import { ProfileSimpleDTO } from '@transcendence/core';
import { AvatarSize, UserActions } from '../../types/react-types';
import UserIdentity from '../atoms/UserIdentity';
import ActionButton from '../atoms/ActionButton';

interface UserRowProps {
  user: ProfileSimpleDTO | null;
  avatarSize?: AvatarSize;
  actions: UserActions[];
  onAction?: (action: UserActions, user: ProfileSimpleDTO) => void;
}

/**
 * UserRow — A user identity + action buttons in a pill-shaped row.
 * Built from UserIdentity + ActionButton atoms.
 *
 * Handles any number of actions — displayed inline, fully responsive.
 * No radial menus or complex toggling: clean, composable, predictable.
 */
const UserRow = ({ user, avatarSize = 'md', actions, onAction }: UserRowProps) => {
  if (!user) return null;

  const handleClick = (e: React.MouseEvent, action: UserActions) => {
    e.stopPropagation();
    onAction?.(action, user);
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2 my-1 rounded-full bg-slate-700/20 hover:bg-slate-700 transition-colors">
      <UserIdentity
        username={user.username}
        avatarUrl={user.avatarUrl}
        isOnline={user.isOnline}
        size={avatarSize}
        className="flex-1"
        nameClassName="text-white text-xs sm:text-sm"
      />
      <div className="flex items-center gap-1.5 shrink-0">
        {actions.map((action) => (
          <ActionButton
            key={action}
            action={action}
            onClick={(e) => handleClick(e, action)}
            showLabel={actions.length === 1}
            size={avatarSize === 'sm' ? 'sm' : 'md'}
          />
        ))}
      </div>
    </div>
  );
};

export default UserRow;
