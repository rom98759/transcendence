import { useTranslation } from 'react-i18next';
import { DataTable, DataCardList } from '../molecules/DataTable';

export type Tournament = {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  createdAt: string;
};

type tournamentsProps = {
  tournaments: Tournament[];
  onJoin: (id: string) => void;
};

const statusLabel: Record<Tournament['status'], string> = {
  WAITING: 'game.waiting',
  IN_PROGRESS: 'game.in_progress',
  FINISHED: 'game.finished',
};

const statusColor: Record<Tournament['status'], string> = {
  WAITING: 'text-emerald-600',
  IN_PROGRESS: 'text-amber-600',
  FINISHED: 'text-gray-500',
};

export function TournamentTableDesktop({ tournaments, onJoin }: tournamentsProps) {
  const { t } = useTranslation();

  return (
    <DataTable<Tournament>
      title={t('game.tournament_available')}
      rowKey={(tour) => tour.id}
      rows={tournaments}
      emptyMessage={t('game.no_tournament')}
      columns={[
        {
          header: t('game.name'),
          cell: (tour) => <span className="font-bold text-gray-700">{tour.name}</span>,
        },
        {
          header: t('game.players'),
          cell: (tour) => (
            <span className="text-gray-600">
              {tour.players} / {tour.maxPlayers}
            </span>
          ),
        },
        {
          header: t('game.status'),
          cell: (tour) => (
            <span className={`font-medium ${statusColor[tour.status]}`}>
              {t(statusLabel[tour.status])}
            </span>
          ),
        },
        {
          header: t('game.action'),
          className: 'text-right',
          cell: (tour) =>
            tour.status === 'WAITING' ? (
              <button
                onClick={() => onJoin(tour.id)}
                className="px-5 py-2 rounded-full bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 hover:scale-105 active:scale-100 transition"
              >
                {t('game.join')}
              </button>
            ) : (
              <button
                onClick={() => onJoin(tour.id)}
                className="px-5 py-2 rounded-full bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600 hover:scale-105 active:scale-100 transition"
              >
                {t('game.watch')}
              </button>
            ),
        },
      ]}
    />
  );
}

export function TournamentListMobile({ tournaments, onJoin }: tournamentsProps) {
  const { t } = useTranslation();
  return (
    <DataCardList<Tournament>
      rows={tournaments}
      rowKey={(tour) => tour.id}
      emptyMessage={t('game.no_tournament')}
      renderCard={(tour) => (
        <>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">{tour.name}</span>
            <span className="text-sm text-gray-500">
              {tour.players} / {tour.maxPlayers}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`font-medium ${statusColor[tour.status]}`}>
              {t(statusLabel[tour.status])}
            </span>
            {tour.status === 'WAITING' && (
              <button
                onClick={() => onJoin(tour.id)}
                className="px-4 py-2 rounded-full bg-teal-500 text-white text-sm"
              >
                {t('game.join')}
              </button>
            )}
            {tour.status === 'IN_PROGRESS' && (
              <button
                onClick={() => onJoin(tour.id)}
                className="px-4 py-2 rounded-full bg-cyan-500 text-white text-sm"
              >
                {t('game.watch')}
              </button>
            )}
            {tour.status === 'FINISHED' && (
              <button
                onClick={() => onJoin(tour.id)}
                className="px-4 py-2 rounded-full bg-gray-500 text-white text-sm"
              >
                {t('game.watch')}
              </button>
            )}
          </div>
        </>
      )}
    />
  );
}
