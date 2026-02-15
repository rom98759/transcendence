import { Player } from '../../types/types';
import { BracketConnection, BracketLines } from '../atoms/BracketLines';
import { PlayerCapsule } from '../atoms/PlayerCapsule';
import { MatchNode } from '../atoms/MatchNode';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface TournamentBracketProps {
  players: [Player, Player, Player, Player];
}

export function TournamentBracket({ players }: TournamentBracketProps) {
  const { t } = useTranslation();
  const [p1, p2, p3, p4] = players;
  const containerRef = useRef<HTMLDivElement>(null);
  const p1Ref = useRef<HTMLDivElement>(null);
  const p2Ref = useRef<HTMLDivElement>(null);
  const p3Ref = useRef<HTMLDivElement>(null);
  const p4Ref = useRef<HTMLDivElement>(null);

  const semiLeftRef = useRef<HTMLDivElement>(null);
  const semiRightRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const littleFinalRef = useRef<HTMLDivElement>(null);

  const connections: BracketConnection[] = [
    { from: p1Ref, to: semiLeftRef },
    { from: p2Ref, to: semiLeftRef },
    { from: p3Ref, to: semiRightRef },
    { from: p4Ref, to: semiRightRef },
    { from: semiLeftRef, to: finalRef },
    { from: littleFinalRef, to: finalRef },
    { from: semiRightRef, to: littleFinalRef },
  ];
  return (
    <div ref={containerRef} className="relative w-[70%] max-w-6xl mx-auto py-12">
      <BracketLines containerRef={containerRef} connections={connections} />

      <div className="relative flex flex-col lg:flex-row justify-between items-center gap-24">
        {/* LEFT */}
        <div className="flex flex-col gap-16">
          <div ref={p1Ref}>
            <PlayerCapsule player={p1} />
          </div>
          <div ref={p2Ref}>
            <PlayerCapsule player={p2} />
          </div>
        </div>

        {/* CENTER */}
        <div className="flex flex-col items-center gap-14">
          <div ref={semiLeftRef}>
            <MatchNode
              label={t('game.semi_final')}
              status="ready"
              onStart={() => console.log(`startSemiFinal('left')`)}
            />
          </div>

          <div ref={finalRef}>
            <MatchNode
              label={t('game.final')}
              highlight
              status="pending"
              onStart={() => console.log(`startFinal()`)}
            />
          </div>
          <div ref={littleFinalRef}>
            <MatchNode
              label={t('game.little_final')}
              highlight
              status="pending"
              onStart={() => console.log(`startLittleFinal()`)}
            />
          </div>

          <div ref={semiRightRef}>
            <MatchNode
              label={t('game.semi_final')}
              status="ready"
              onStart={() => console.log(`startSemiFinal('right')`)}
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-16">
          <div ref={p3Ref}>
            <PlayerCapsule player={p3} />
          </div>
          <div ref={p4Ref}>
            <PlayerCapsule player={p4} />
          </div>
        </div>
      </div>
    </div>
  );
}
