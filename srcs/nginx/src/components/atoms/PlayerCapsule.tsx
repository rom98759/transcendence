import { Player } from '../../types/types';
import UserIdentity from './UserIdentity';

export function PlayerCapsule({ player }: { player: Player }) {
  const isWaiting = player.status === 'waiting';
  return (
    <div
      className={`
        px-4 py-2 rounded-full
        border backdrop-blur overflow-hidden
        ${isWaiting ? 'border-gray-400 bg-white/10 opacity-95' : 'border-cyan-300 bg-white/80'}
      `}
    >
      <UserIdentity
        username={player.name}
        avatarUrl={player.avatar}
        isOnline={player.online === true}
        size="sm"
        dotBorderClass="border-white"
        nameClassName="text-sm text-gray-700 whitespace-nowrap"
      />
    </div>
  );
}
