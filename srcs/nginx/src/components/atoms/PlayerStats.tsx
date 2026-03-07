import { useTranslation } from 'react-i18next';
import { DataTable, DataCardList } from '../molecules/DataTable';

export interface PlayerStat {
  player_id: number;
  username: string;
  tournaments_played: number;
  tournaments_won: number;
  tournaments_lost?: number;
  matches_played: number;
  matches_won: number;
  matches_lost?: number;
  tournamentsWinRate: number;
  matchesWinRate: number;
  points_scored?: number;
  points_conceded?: number;
  avg_points_scored?: number;
  avg_points_conceded?: number;
  last_match_at?: number | null;
}

export const StatsTableDesktop = ({
  stats,
  showRank = false,
}: {
  stats: PlayerStat[];
  showRank?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <DataTable<PlayerStat>
      title={t('stats.title')}
      rowKey={(row) => row.player_id}
      rows={stats}
      emptyMessage={t('stats.empty')}
      columns={[
        ...(showRank
          ? [
              {
                header: '#',
                cell: (_row: PlayerStat, index: number) => (
                  <span className="font-bold text-gray-500">{index + 1}</span>
                ),
              },
            ]
          : []),
        {
          header: t('stats.player'),
          cell: (row) => <span className="font-bold text-gray-700">{row.username}</span>,
        },
        {
          header: t('stats.tournaments_played'),
          cell: (row) => <span className="text-gray-600">{row.tournaments_played}</span>,
        },
        {
          header: t('stats.tournaments_won'),
          cell: (row) => (
            <span
              className={row.tournaments_won > 0 ? 'font-medium text-emerald-600' : 'text-gray-500'}
            >
              {row.tournaments_won}
            </span>
          ),
        },
        {
          header: t('stats.tournaments_win_rate'),
          cell: (row) => <span className="text-cyan-600">{row.tournamentsWinRate} %</span>,
        },
        {
          header: t('stats.matches_played'),
          cell: (row) => <span className="text-gray-600">{row.matches_played}</span>,
        },
        {
          header: t('stats.matches_won'),
          cell: (row) => (
            <span
              className={row.matches_won > 0 ? 'font-medium text-emerald-600' : 'text-gray-500'}
            >
              {row.matches_won}
            </span>
          ),
        },
        {
          header: t('stats.matches_lost'),
          cell: (row) => <span className="text-rose-500">{row.matches_lost ?? 0}</span>,
        },
        {
          header: t('stats.matches_win_rate'),
          className: 'text-right',
          cell: (row) => <span className="text-cyan-600">{row.matchesWinRate} %</span>,
        },
      ]}
    />
  );
};

export const StatsListMobile = ({
  stats,
  showRank = false,
}: {
  stats: PlayerStat[];
  showRank?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <DataCardList<PlayerStat>
      rows={stats}
      rowKey={(row) => row.player_id}
      emptyMessage={t('stats.empty')}
      renderCard={(row, index) => (
        <>
          <div className="font-semibold text-gray-700 text-base">
            {showRank && <span className="text-gray-400 mr-2">#{(index ?? 0) + 1}</span>}
            {row.username}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(
              [
                [t('stats.tournaments_played'), row.tournaments_played, false],
                [t('stats.tournaments_won'), row.tournaments_won, row.tournaments_won > 0],
                [t('stats.matches_played'), row.matches_played, false],
                [t('stats.matches_won'), row.matches_won, row.matches_won > 0],
                [t('stats.matches_lost'), row.matches_lost ?? 0, false],
                [t('stats.points_scored'), row.points_scored ?? 0, false],
              ] as [string, number, boolean][]
            ).map(([label, value, highlight]) => (
              <div key={label} className="bg-gray-50 rounded-xl p-2 text-center">
                <div className="text-gray-500 text-xs mb-1">{label}</div>
                <div
                  className={
                    highlight ? 'text-emerald-600 font-semibold' : 'text-gray-700 font-semibold'
                  }
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    />
  );
};
