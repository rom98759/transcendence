// ============================================================================
// TournamentHubPage — Page d'accueil des tournois
//
// Polling léger (5 s) pour rafraîchir la liste.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { createTournament, listTournaments, joinTournament } from '../api/tournament-api';
import type { TournamentDTO } from '@transcendence/core';
import {
  TournamentTableDesktop,
  TournamentListMobile,
  Tournament,
} from '../components/atoms/TournamentList';
import { CircleButton } from '../components/atoms/CircleButtonSimple';

function mapTournamentDTO(dto: TournamentDTO): Tournament {
  return {
    id: dto.id.toString(),
    name: dto.username,
    players: dto.player_count,
    maxPlayers: 4,
    status:
      dto.status === 'PENDING' ? 'WAITING' : dto.status === 'STARTED' ? 'IN_PROGRESS' : 'FINISHED',
    createdAt: new Date().toISOString(),
  };
}

export default function TournamentHubPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [creating, setCreating] = useState(false);

  // ── Fetch loop ─────────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    try {
      const data = await listTournaments();
      setTournaments(data.map(mapTournamentDTO));
    } catch (err) {
      console.error('Failed to fetch tournaments', err);
    }
  }, []);

  useEffect(() => {
    fetchList();
    const id = setInterval(fetchList, 5_000);
    return () => clearInterval(id);
  }, [fetchList]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const id = await createTournament();
      navigate(`/tournaments/${id}`);
    } catch {
      toast.error(t('game.error.failed_create_tournament'));
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (id: string) => {
    try {
      await joinTournament(id);
      navigate(`/tournaments/${id}`);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 409) {
        toast.warn(t('game.tournament_full'));
      } else {
        // Already in tournament — navigate anyway
        navigate(`/tournaments/${id}`);
      }
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto py-8 px-4">
      {/* Create button */}
      <CircleButton
        onClick={handleCreate}
        disabled={creating}
        className={`
          px-8 py-3 rounded-full text-lg font-quantico font-semibold
          transition-all
          ${
            creating
              ? 'bg-gray-400 text-gray-200 cursor-wait'
              : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105 active:scale-100'
          }
        `}
      >
        {creating ? t('game.creating') : t('game.create')}
      </CircleButton>

      {/* Tournament list */}
      <div className="w-full">
        <div className="hidden md:block">
          <TournamentTableDesktop tournaments={tournaments} onJoin={handleJoin} />
        </div>
        <div className="md:hidden space-y-4">
          <TournamentListMobile tournaments={tournaments} onJoin={handleJoin} />
        </div>
      </div>
    </div>
  );
}
