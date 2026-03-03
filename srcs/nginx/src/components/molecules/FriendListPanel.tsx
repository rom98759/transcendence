import { FriendshipUnifiedDTO, ProfileSimpleDTO } from '@transcendence/core';
import { useTranslation } from 'react-i18next';
import { Loader, X } from 'lucide-react';
import UserIdentity from '../atoms/UserIdentity';
import ActionButton from '../atoms/ActionButton';
import UserSearchContainer from './UserSearchContainer';
import { UserActions } from '../../types/react-types';

interface FriendItemProps {
  friendship: FriendshipUnifiedDTO;
  onRemove: (user: ProfileSimpleDTO) => void;
}

/**
 * Single friend row — compact, with avatar, username, online status and remove action.
 * Composed from UserIdentity + ActionButton atoms.
 */
const FriendItem = ({ friendship, onRemove }: FriendItemProps) => {
  const friend = friendship.friend;
  const isOnline = friendship.isOnline ?? friend.isOnline ?? false;

  return (
    <div className="group flex items-center gap-1.5 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-xl hover:bg-white/10 transition-colors duration-200">
      <UserIdentity
        username={friend.username}
        displayName={friendship.nickname || friend.username}
        avatarUrl={friend.avatarUrl}
        isOnline={isOnline}
        size="xs"
        linkToProfile
        className="flex-1"
        nameClassName="text-white text-xs"
      />
      <ActionButton
        action={UserActions.REMOVE}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(friend);
        }}
        size="sm"
        variant="ghost"
        className="opacity-100 sm:opacity-0 group-hover:opacity-100"
      />
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
    <div className={`flex flex-col h-full ${isCompact ? 'gap-2' : 'gap-4'} ${className}`}>
      {/* ── Add Friend Section ── */}
      <div className="shrink-0">
        <h2
          className={`font-quantico text-gray-400 mb-2 ${isCompact ? 'text-xs uppercase tracking-wider' : 'text-sm'}`}
        >
          {t('friends.add_friend')}
        </h2>
        <UserSearchContainer
          isSearch={true}
          actions={[UserActions.ADD]}
          onAction={handleSearchAction}
          compact={isCompact}
        />
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="shrink-0 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm">
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

      {/* ── Friend List ── */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <h2
            className={`font-quantico text-gray-400 ${isCompact ? 'text-xs uppercase tracking-wider' : 'text-sm'}`}
          >
            {t('friends.my_friends')}
          </h2>
          <span className="text-xs text-gray-500 font-quantico">{friends.length}</span>
        </div>

        {/* ── Scrollable List — fills all remaining space ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
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
