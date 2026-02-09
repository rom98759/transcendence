import { Player } from '../../types/types';
import Avatar from './Avatar';

export function PlayerCapsule({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-cyan-300 bg-white/80 shadow-sm backdrop-blur">
      <Avatar src={player.avatar} size="sm" />
      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{player.name}</span>
    </div>
  );
}
