// ============================================================================
// TournamentResultsPage — Page de résultats autonome
//
// Accessible à /tournaments/:id/results.
// Utilise getTournamentState pour récupérer les matchs depuis le backend
// (plus besoin de /game/history user-scoped).
// Réutilise TournamentResultsScreen pour le rendu (podium + détails).
// ============================================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getTournamentState } from '../api/tournament-api';
import TournamentResultsScreen, {
  TournamentHistoryMatch,
} from '../components/organisms/game/TournamentResultsScreen';

const ROUND_ORDER: Record<string, number> = {
  SEMI_1: 1,
  SEMI_2: 2,
  LITTLE_FINAL: 3,
  FINAL: 4,
};

export default function TournamentResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [matches, setMatches] = useState<TournamentHistoryMatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    getTournamentState(id)
      .then((state) => {
        const mapped: TournamentHistoryMatch[] = state.matches
          .map((m) => ({
            id: m.id,
            tournament_id: parseInt(id, 10),
            round: m.round,
            player1: m.player1,
            player2: m.player2,
            score_player1: m.score_player1,
            score_player2: m.score_player2,
            winner_id: m.winner_id,
            created_at: Date.now(),
            username_player1: m.username_player1,
            username_player2: m.username_player2,
            username_winner: m.username_winner,
          }))
          .sort((a, b) => (ROUND_ORDER[a.round] ?? 99) - (ROUND_ORDER[b.round] ?? 99));

        setMatches(mapped);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ?? err.message ?? t('game.tournament_results.fetch_error'),
        );
      });
  }, [id, t]);

  return (
    <TournamentResultsScreen
      tournamentId={id ?? null}
      matches={matches}
      error={error}
      onExit={() => navigate('/tournaments')}
      hideNavBar
    />
  );
}
