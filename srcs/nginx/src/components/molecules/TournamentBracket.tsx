import { Player } from '../../types/types';
import type { MatchStatus } from '../../types/types';
import { BracketConnection, BracketLines } from '../atoms/BracketLines';
import { PlayerCapsule } from '../atoms/PlayerCapsule';
import { MatchNode } from '../atoms/MatchNode';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { TournamentMatchDTO, MatchToPlayDTO } from '@transcendence/core';

interface TournamentBracketProps {
  players: [Player, Player, Player, Player];
  tournamentId: string;
  /** Live match data from getTournamentState (empty array when PENDING). */
  matches?: TournamentMatchDTO[];
  /** The current user's next playable match, or null. */
  myMatch?: MatchToPlayDTO | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMatchStatus(match: TournamentMatchDTO | undefined): MatchStatus {
  if (!match) return 'pending';
  if (match.winner_id !== null) return 'finished';
  if (match.sessionId) return 'running';
  return 'ready';
}

function getMatchScore(match: TournamentMatchDTO | undefined): string | null {
  if (!match || match.winner_id === null) return null;
  return `${match.score_player1} - ${match.score_player2}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export function TournamentBracket({
  players,
  tournamentId,
  matches = [],
  myMatch,
}: TournamentBracketProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [p1, p2, p3, p4] = players;

  // Refs for SVG bracket lines
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

  // Match lookup by round
  const matchByRound = new Map(matches.map((m) => [m.round, m]));
  const semi1 = matchByRound.get('SEMI_1');
  const semi2 = matchByRound.get('SEMI_2');
  const final_ = matchByRound.get('FINAL');
  const littleFinal = matchByRound.get('LITTLE_FINAL');

  const isAllConnected = players.every((p) => p.status === 'connected');

  /** True when this round is the current user's playable match. */
  const canPlayMatch = (round: string): boolean =>
    myMatch !== null && myMatch !== undefined && myMatch.round === round;

  /** Navigate to the game page for this tournament. */
  const handlePlay = () => {
    navigate(`/game/tournament/${tournamentId}`);
  };

  return (
    <div ref={containerRef} className="relative w-[70%] max-w-6xl mx-auto py-12">
      <BracketLines containerRef={containerRef} connections={connections} />

      <div className="relative flex flex-col lg:flex-row justify-between items-center gap-24">
        {/* LEFT — players 1 & 2 */}
        <div className="flex flex-col gap-16">
          <div ref={p1Ref}>
            <PlayerCapsule player={p1} />
          </div>
          <div ref={p2Ref}>
            <PlayerCapsule player={p2} />
          </div>
        </div>

        {/* CENTER — match nodes */}
        <div className="flex flex-col items-center gap-14">
          <div ref={semiLeftRef}>
            <MatchNode
              label={t('game.semi_final') + ' 1'}
              status={getMatchStatus(semi1)}
              score={getMatchScore(semi1)}
              winner={semi1?.username_winner}
              canPlay={canPlayMatch('SEMI_1')}
              onPlay={handlePlay}
            />
          </div>

          <div ref={finalRef}>
            <MatchNode
              label={t('game.final')}
              highlight
              status={getMatchStatus(final_)}
              score={getMatchScore(final_)}
              winner={final_?.username_winner}
              canPlay={canPlayMatch('FINAL')}
              onPlay={handlePlay}
            />
          </div>

          <div ref={littleFinalRef}>
            <MatchNode
              label={t('game.little_final')}
              status={getMatchStatus(littleFinal)}
              score={getMatchScore(littleFinal)}
              winner={littleFinal?.username_winner}
              canPlay={canPlayMatch('LITTLE_FINAL')}
              onPlay={handlePlay}
            />
          </div>

          <div ref={semiRightRef}>
            <MatchNode
              label={t('game.semi_final') + ' 2'}
              status={getMatchStatus(semi2)}
              score={getMatchScore(semi2)}
              winner={semi2?.username_winner}
              canPlay={canPlayMatch('SEMI_2')}
              onPlay={handlePlay}
            />
          </div>
        </div>

        {/* RIGHT — players 3 & 4 */}
        <div className="flex flex-col gap-16">
          <div ref={p3Ref}>
            <PlayerCapsule player={p3} />
          </div>
          <div ref={p4Ref}>
            <PlayerCapsule player={p4} />
          </div>
        </div>
      </div>

      {/* Status indicators */}
      {!isAllConnected && matches.length === 0 && (
        <p className="text-center text-white/60 font-quantico mt-8 animate-pulse">
          {t('game.waiting_players')}
        </p>
      )}
      {isAllConnected && matches.length === 0 && (
        <p className="text-center text-white/60 font-quantico mt-8 animate-pulse">
          {t('game.starting_tournament')}
        </p>
      )}
    </div>
  );
}
