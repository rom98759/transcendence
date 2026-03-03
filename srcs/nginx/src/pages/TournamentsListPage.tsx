import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  TournamentTableDesktop,
  TournamentListMobile,
  Tournament,
} from '../components/atoms/TournamentList';
import { useNavigate } from 'react-router-dom';
import { TournamentDTO } from '@transcendence/core';
import api from '../api/api-client';
import { useTranslation } from 'react-i18next';

function mapTournamentDTO(dto: TournamentDTO): Tournament {
  return {
    id: dto.id.toString(),
    name: `${dto.username}`,
    players: dto.player_count,
    maxPlayers: 4, // valeur fixe ou champ dans la base
    status: dto.status === 'PENDING' ? 'WAITING' : 'IN_PROGRESS',
    createdAt: new Date().toISOString(), // ou champ futur
  };
}

/*
 * This component links to two other components depending on the media because
 * tables do not display correctly on mobile devices.
 */
export default function TournamentsListPage() {
  const { t } = useTranslation();
  const [tournaments, setTournament] = useState<Tournament[]>([]);
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const { data } = await api.get<TournamentDTO[]>(`/game/tournaments`);
        setTournament(data.map(mapTournamentDTO));
      } catch (err) {
        console.error(err);
      }
    };
    fetchTournaments();
    const interval = setInterval(fetchTournaments, 20000);
    return () => clearInterval(interval);
  }, []);
  const navigate = useNavigate();
  const onJoin = async (id: string) => {
    try {
      await api.post(`/game/tournaments/${id}`);
      navigate(`/tournaments/${id}`);
    } catch (err: any) {
      const errorCode = err.response?.data?.code;

      if (errorCode === 'TOURNAMENT_FULL') {
        toast(t('game.tournament_full'));
      } else {
        // already in tournament
        navigate(`/tournaments/${id}`);
      }
    }
  };
  return (
    <>
      <div className="hidden md:block w-full">
        <TournamentTableDesktop tournaments={tournaments} onJoin={onJoin} />
      </div>

      <div className="md:hidden space-y-4 w-full">
        <TournamentListMobile tournaments={tournaments} onJoin={onJoin} />
      </div>
    </>
  );
}
