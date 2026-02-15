import { useState } from 'react';
import { Player } from 'src/types/types';
import { PlayerCapsule } from '../atoms/PlayerCapsule';
import { useTranslation } from 'react-i18next';

interface FriendsListProps {
  friends: Player[];
}

export const FriendsList = ({ friends }: FriendsListProps) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div
      className={`
        fixed top-24 left-0 z-40
        transition-all duration-300 ease-in-out
        ${open ? 'w-64' : 'w-auto h-10 opacity-65'}
      `}
    >
      <div
        className={`
          h-full bg-white/70 backdrop-blur-lg
          border-r border-cyan-200
          shadow-lg
          rounded-r-2xl
          p-3
        `}
      >
        {/* Header / Toggle */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="
            w-full flex items-center justify-between
            font-quantico text-sm font-semibold
            text-gray-700 mb-4
          "
        >
          <span>{t('game.friends')}&nbsp;</span>
          <span
            className={`
              transition-transform duration-300
              ${open ? 'rotate-180' : ''}
            `}
          >
            ◀
          </span>
        </button>

        {/* List */}
        {open && (
          <div className="flex flex-col gap-3">
            {friends.map((friend) => (
              <PlayerCapsule key={friend.id} player={friend} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
