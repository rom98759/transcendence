// ============================================================================
// useTournamentLive — Hook de polling adaptatif pour l'état d'un tournoi
//
// Responsabilité : fetch périodique de getTournamentState avec rythme adapté
//   - 5s en PENDING  (attente des joueurs)
//   - 2s en STARTED  (matchs en cours)
//   - Arrêt automatique en FINISHED
//   - Refetch immédiat au retour d'onglet (Page Visibility API)
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTournamentState, getMatchToPlay } from '../api/tournament-api';
import type { TournamentFullStateDTO, MatchToPlayDTO } from '@transcendence/core';

/** Polling intervals per tournament status */
const POLL_MS_PENDING = 5_000;
const POLL_MS_STARTED = 2_000;

export interface UseTournamentLiveReturn {
  /** Full tournament state (status + players + matches). null until first fetch. */
  state: TournamentFullStateDTO | null;
  /** Current user's next match to play, or null if none. */
  myMatch: MatchToPlayDTO | null;
  isLoading: boolean;
  error: string | null;
  /** Force an immediate refetch (e.g. after create/join/gameOver). */
  refetch: () => Promise<void>;
}

export function useTournamentLive(tournamentId: string | undefined): UseTournamentLiveReturn {
  const [state, setState] = useState<TournamentFullStateDTO | null>(null);
  const [myMatch, setMyMatch] = useState<MatchToPlayDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref tracking the latest status to adapt the polling interval
  const statusRef = useRef<string | null>(null);

  const fetchState = useCallback(async () => {
    if (!tournamentId) return;
    try {
      // 1. Always fetch the full tournament state first
      const fullState = await getTournamentState(tournamentId);
      setState(fullState);
      statusRef.current = fullState.status;

      // 2. Only resolve the user's next match when matches actually exist (STARTED)
      if (fullState.status === 'STARTED') {
        const matchToPlay = await getMatchToPlay(tournamentId);
        setMyMatch(matchToPlay);
      } else {
        setMyMatch(null);
      }

      setError(null);
    } catch (err: any) {
      const msg = err.response?.data?.message ?? err.message ?? 'Erreur réseau';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId) return;

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      await fetchState();
      if (!active) return;

      const status = statusRef.current;
      // Stop polling once the tournament is finished
      if (status === 'FINISHED') return;

      const delay = status === 'STARTED' ? POLL_MS_STARTED : POLL_MS_PENDING;
      timeoutId = setTimeout(poll, delay);
    };

    // Kick off the first poll immediately
    poll();

    // Refetch immédiat lorsque l'onglet redevient visible
    const onVisibility = () => {
      if (!document.hidden && active) {
        clearTimeout(timeoutId);
        poll();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      active = false;
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [tournamentId, fetchState]);

  return { state, myMatch, isLoading, error, refetch: fetchState };
}
