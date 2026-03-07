// ============================================================================
// TournamentBracketPage — Page bracket avec polling adaptatif
//
// Utilise useTournamentLive pour maintenir l'état du tournoi en temps réel.
// Redirige automatiquement vers /tournaments/:id/results si FINISHED.
// Remplace l'ancien TournamentPage (polling 20 s, pas de matchs, bouton « Run »).
// ============================================================================

import { useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTournamentLive } from '../hooks/useTournamentLive';
import { TournamentBracket } from '../components/molecules/TournamentBracket';
import type { Player } from '../types/types';
import type { PlayerDTO } from '@transcendence/core';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapToPlayer(dto: PlayerDTO): Player {
  return {
    id: dto.player_id.toString(),
    name: dto.username,
    avatar: dto.avatar,
    slot: dto.slot,
    online: true,
    status: 'connected',
  };
}

function fillSlots(players: Player[], waitingLabel: string): [Player, Player, Player, Player] {
  const slots: (Player | null)[] = [null, null, null, null];

  players.forEach((p) => {
    const idx = p.slot - 1;
    if (idx >= 0 && idx < 4) slots[idx] = p;
  });

  for (let i = 0; i < 4; i++) {
    if (!slots[i]) {
      slots[i] = {
        id: `waiting-${i + 1}`,
        name: waitingLabel,
        avatar: null,
        slot: (i + 1) as 1 | 2 | 3 | 4,
        online: false,
        status: 'waiting',
      };
    }
  }

  return slots as [Player, Player, Player, Player];
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TournamentBracketPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { state, myMatch, isLoading, error } = useTournamentLive(id);

  // Guard: no id → back to hub
  if (!id) return <Navigate to="/tournaments" replace />;

  // Automatic redirect when the tournament is finished
  if (state?.status === 'FINISHED') {
    return <Navigate to={`/tournaments/${id}/results`} replace />;
  }

  // Loading spinner
  if (isLoading && !state) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-200 border-t-transparent" />
      </div>
    );
  }

  // Hard error (network, 500…)
  if (error && !state) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-400 font-quantico">{error}</p>
      </div>
    );
  }

  const players = state
    ? fillSlots(
        state.players.map((p) => mapToPlayer(p)),
        t('game.waiting'),
      )
    : fillSlots([], t('game.waiting'));

  return (
    <TournamentBracket
      players={players}
      tournamentId={id}
      matches={state?.matches ?? []}
      myMatch={myMatch}
    />
  );
}
