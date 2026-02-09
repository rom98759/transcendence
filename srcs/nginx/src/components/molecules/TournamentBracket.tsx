import { Player } from '../../types/types';
import { BracketLines } from '../atoms/BracketLines';
import { PlayerCapsule } from '../atoms/PlayerCapsule';
import { MatchNode } from '../atoms/MatchNode';

interface TournamentBracketProps {
  players: [Player, Player, Player, Player];
}
import Avatar from '../atoms/Avatar';

export function TournamentBracket({ players }: TournamentBracketProps) {
  const [p1, p2, p3, p4] = players;

  return (
    <div className="relative w-full max-w-6xl mx-auto py-12">
      {/* SVG LINES */}
      <BracketLines />

      {/* CONTENT */}
      <div className="relative flex flex-col lg:flex-row justify-between items-center gap-20">
        {/* LEFT */}
        <div className="flex flex-col gap-16">
          <PlayerCapsule player={p1} />
          <PlayerCapsule player={p2} />
        </div>

        {/* CENTER */}
        <div className="flex flex-col items-center gap-10">
          <MatchNode label="Demi-finale" />
          <MatchNode label="Finale" highlight />
          <MatchNode label="Petite finale" />
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-16">
          <PlayerCapsule player={p3} />
          <PlayerCapsule player={p4} />
        </div>
      </div>
    </div>
  );
}
