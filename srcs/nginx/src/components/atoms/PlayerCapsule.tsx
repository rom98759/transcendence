import { Player } from '../../types/types';
import Avatar from './Avatar';

export function PlayerCapsule({ player }: { player: Player }) {
  const isOnline = player.online === true;
  const isWaiting = player.status === 'waiting';
  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2 rounded-full
        border backdrop-blur overflow-hidden
          ${isWaiting ? 'border-gray-400 bg-white/10 opacity-95' : 'border-cyan-300 bg-white/80'}
        `}
    >
      {/* Avatar + status */}
      <div className="relative">
        <Avatar src={player.avatar} size="sm" />

        <span
          className={[
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
            isOnline ? 'bg-emerald-500' : 'bg-gray-400',
          ].join(' ')}
          aria-label={isOnline ? 'online' : 'offline'}
        />
      </div>

      {/* Name */}
      <span className="text-sm font-medium text-gray-700 font-quantico whitespace-nowrap">
        {player.name}
      </span>
    </div>
  );
}
