import { AvatarSize } from '../../types/react-types';
import Avatar from './Avatar';
import { Link } from 'react-router-dom';

/** Online indicator dot sizes matching each avatar size */
const DOT_SIZES: Record<AvatarSize, string> = {
  xs: 'w-2 h-2',
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

interface UserIdentityProps {
  /** Real username — used for profile routing */
  username: string;
  /** Override displayed text (e.g. nickname). Defaults to username. */
  displayName?: string;
  /** Avatar image URL. Falls back to default avatar via Avatar atom. */
  avatarUrl?: string | null;
  /** Online status. `undefined` → no indicator shown. */
  isOnline?: boolean;
  /** Avatar size */
  size?: AvatarSize;
  /** Wrap avatar & name in a Link to /profile/:username */
  linkToProfile?: boolean;
  /** Layout direction */
  direction?: 'row' | 'col';
  /** Border color class for the online dot (adapt to bg context) */
  dotBorderClass?: string;
  /** Additional CSS on root container */
  className?: string;
  /** Additional CSS on the name text */
  nameClassName?: string;
}

/**
 * UserIdentity — Atomic component that displays a user's avatar
 * (with optional online indicator) and name.
 *
 * Composable in rows, cards, sidebars or profiles.
 * Consumers: UserRow, FriendItem, PlayerCapsule, ProfilePage…
 */
const UserIdentity = ({
  username,
  displayName,
  avatarUrl,
  isOnline,
  size = 'sm',
  linkToProfile = false,
  direction = 'row',
  dotBorderClass = 'border-slate-900',
  className = '',
  nameClassName = '',
}: UserIdentityProps) => {
  const shownName = displayName ?? username;
  const profilePath = `/profile/${username}`;
  const isRow = direction === 'row';

  const avatarBlock = (
    <div className="relative shrink-0">
      <Avatar src={avatarUrl ?? null} size={size} />
      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${DOT_SIZES[size]} rounded-full border-2 ${dotBorderClass} ${
            isOnline ? 'bg-emerald-500' : 'bg-gray-400'
          }`}
          aria-label={isOnline ? 'online' : 'offline'}
        />
      )}
    </div>
  );

  const nameBlock = (
    <span
      className={`font-quantico font-semibold tracking-wide ${isRow ? 'truncate' : ''} ${nameClassName}`}
    >
      {shownName}
    </span>
  );

  const dirClasses = isRow ? 'items-center gap-2' : 'flex-col items-center gap-1';
  const nameWrapperClass = isRow ? 'min-w-0 flex-1' : '';

  return (
    <div className={`flex ${dirClasses} min-w-0 ${className}`}>
      {linkToProfile ? (
        <Link to={profilePath} className="shrink-0">
          {avatarBlock}
        </Link>
      ) : (
        avatarBlock
      )}
      {linkToProfile ? (
        <Link
          to={profilePath}
          className={`${nameWrapperClass} hover:text-cyan-300 transition-colors`}
        >
          {nameBlock}
        </Link>
      ) : (
        <div className={nameWrapperClass}>{nameBlock}</div>
      )}
    </div>
  );
};

export default UserIdentity;
