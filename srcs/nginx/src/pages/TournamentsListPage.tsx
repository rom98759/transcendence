import {
  TournamentTableDesktop,
  TournamentListMobile,
  Tournament,
} from '../components/atoms/TournamentList';
import { useNavigate } from 'react-router-dom';

const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: '1',
    name: 'Spin Cup #42',
    players: 2,
    maxPlayers: 4,
    status: 'WAITING',
    createdAt: '2026-02-01',
  },
  {
    id: '2',
    name: 'Weekly Pong',
    players: 4,
    maxPlayers: 4,
    status: 'IN_PROGRESS',
    createdAt: '2026-02-03',
  },
];

/*
 * This component links to two other components depending on the media because
 * tables do not display correctly on mobile devices.
 */
export default function TournamentsListPage() {
  const navigate = useNavigate();
  return (
    <>
      <div className="hidden md:block w-full">
        <TournamentTableDesktop
          tournaments={MOCK_TOURNAMENTS}
          onJoin={(id) => navigate(`/tournaments/${id}`)}
        />
      </div>

      <div className="md:hidden space-y-4 w-full">
        <TournamentListMobile
          tournaments={MOCK_TOURNAMENTS}
          onJoin={(id) => navigate(`/tournaments/${id}`)}
        />
      </div>
    </>
  );
}
