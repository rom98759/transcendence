import { FriendshipUnifiedDTO, ProfileSimpleDTO } from '@transcendence/core';
import { useTranslation } from 'react-i18next';
import { Loader, UserMinus, X } from 'lucide-react';
import Avatar from '../atoms/Avatar';
import defaultAvatar from '../../assets/avatars/default.png';
import { Link } from 'react-router-dom';
import UserSearchContainer from './UserSearchContainer';
import { UserActions } from '../../types/react-types';

interface FriendItemProps {
  friendship: FriendshipUnifiedDTO;
  onRemove: (user: ProfileSimpleDTO) => void;
}

/**
 * Single friend row — compact, with avatar, username and remove action.
 */
const FriendItem = ({ friendship, onRemove }: FriendItemProps) => {
  const friend = friendship.friend;

  return (
    <div className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors duration-200">
      {/* Avatar + online indicator */}
      <Link to={`/profile/${friend.username}`} className="relative shrink-0">
        <Avatar src={friend.avatarUrl || defaultAvatar} size="sm" />
      </Link>

      {/* Username */}
      <Link
        to={`/profile/${friend.username}`}
        className="flex-1 min-w-0 text-white text-sm font-quantico font-semibold tracking-wide truncate hover:text-cyan-300 transition-colors"
      >
        {friendship.nickname || friend.username}
      </Link>

      {/* Remove button — visible on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(friend);
        }}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-red-500/20 transition-all duration-200"
        title="Remove friend"
      >
        <UserMinus size={16} className="text-red-400" />
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────── */

interface FriendListPanelProps {
  /** Friend list data */
  friends: FriendshipUnifiedDTO[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Called when user wants to add a friend */
  onAddFriend: (user: ProfileSimpleDTO) => void;
  /** Called when user wants to remove a friend */
  onRemoveFriend: (user: ProfileSimpleDTO) => void;
  /** Called to clear an error */
  onClearError?: () => void;
  /** Visual variant */
  variant?: 'full' | 'compact';
  /** Extra CSS classes on the root */
  className?: string;
}

/**
 * FriendListPanel — Reusable friend list with search, scrollable list,
 * and add/remove friend capabilities.
 *
 * `variant="full"` : for the dedicated friends page (wider, more padding)
 * `variant="compact"` : for the sidebar (narrow, denser)
 */
const FriendListPanel = ({
  friends,
  isLoading,
  error,
  onAddFriend,
  onRemoveFriend,
  onClearError,
  variant = 'full',
  className = '',
}: FriendListPanelProps) => {
  const { t } = useTranslation();
  const isCompact = variant === 'compact';

  const handleSearchAction = (action: UserActions, user: ProfileSimpleDTO) => {
    if (action === UserActions.ADD) {
      onAddFriend(user);
    }
  };

  return (
    <div className={`flex flex-col ${isCompact ? 'gap-2' : 'gap-4'} ${className}`}>
      {/* ── Add Friend Section ── */}
      <div>
        <h2
          className={`font-quantico text-gray-400 mb-2 ${isCompact ? 'text-xs uppercase tracking-wider' : 'text-sm'}`}
        >
          {t('friends.add_friend')}
        </h2>
        <UserSearchContainer
          isSearch={true}
          actions={[UserActions.ADD]}
          onAction={handleSearchAction}
        />
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm">
          <span className="flex-1">{error}</span>
          {onClearError && (
            <button
              onClick={onClearError}
              className="p-0.5 hover:bg-red-500/20 rounded-full transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* ── Friend List Header ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2
            className={`font-quantico text-gray-400 ${isCompact ? 'text-xs uppercase tracking-wider' : 'text-sm'}`}
          >
            {t('friends.my_friends')}
          </h2>
          <span className="text-xs text-gray-500 font-quantico">{friends.length}</span>
        </div>

        {/* ── Scrollable List ── */}
        <div
          className={`overflow-y-auto no-scrollbar ${isCompact ? 'max-h-[50vh]' : 'max-h-[60vh]'}`}
        >
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader size={20} className="text-cyan-400 animate-spin" />
              <span className="text-gray-400 text-sm ml-2">{t('global.loading')}</span>
            </div>
          )}

          {!isLoading && friends.length === 0 && (
            <p className="text-gray-500 italic text-sm text-center py-6">
              {t('friends.no_friends')}
            </p>
          )}

          {!isLoading && friends.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {friends.map((f) => (
                <FriendItem key={f.id} friendship={f} onRemove={onRemoveFriend} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendListPanel;
