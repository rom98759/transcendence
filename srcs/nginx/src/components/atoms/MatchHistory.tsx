import { useTranslation } from 'react-i18next';
import { DataTable, DataCardList } from '../molecules/DataTable';

export interface MatchHistory {
  id: number;
  tournament_id: number | null;
  round: string | null;
  player1?: number | null;
  player2?: number | null;
  score_player1: number | null;
  score_player2: number | null;
  winner_id: number | null;
  created_at: number;
  username_player1: string;
  username_player2: string;
  username_winner: string | null;
  opponent_username?: string | null;
  result?: 'WIN' | 'LOSS' | 'PENDING';
}

export const HistoryTableDesktop = ({ history }: { history: MatchHistory[] }) => {
  const { t } = useTranslation();

  const roundLabel: Record<string, string> = {
    SEMI_1: t('history.semi1'),
    SEMI_2: t('history.semi2'),
    LITTLE_FINAL: t('history.little_final'),
    FINAL: t('history.final'),
  };

  return (
    <DataTable<MatchHistory>
      title={t('history.title')}
      rowKey={(m) => m.id}
      rows={history}
      emptyMessage={t('history.empty')}
      columns={[
        {
          header: t('history.date'),
          cell: (m) => (
            <span className="text-xs text-gray-500">{new Date(m.created_at).toLocaleString()}</span>
          ),
        },
        {
          header: t('history.round'),
          cell: (m) => (
            <span className="text-gray-600">
              {m.round ? (roundLabel[m.round] ?? m.round) : '—'}
            </span>
          ),
        },
        {
          header: t('history.player1'),
          cell: (m) => <span className="font-bold text-gray-700">{m.username_player1}</span>,
        },
        {
          header: t('history.score'),
          className: 'text-center',
          cell: (m) => (
            <span className="font-bold text-teal-600">
              {m.score_player1 ?? '—'} – {m.score_player2 ?? '—'}
            </span>
          ),
        },
        {
          header: t('history.player2'),
          cell: (m) => <span className="font-bold text-gray-700">{m.username_player2}</span>,
        },
        {
          header: t('history.winner'),
          cell: (m) => (
            <span className="font-medium text-emerald-600">{m.username_winner ?? '—'}</span>
          ),
        },
        {
          header: t('history.result'),
          cell: (m) => {
            if (m.result === 'WIN')
              return <span className="font-medium text-emerald-600">WIN</span>;
            if (m.result === 'LOSS') return <span className="font-medium text-rose-500">LOSS</span>;
            return <span className="font-medium text-amber-600">PENDING</span>;
          },
        },
        {
          header: t('history.tournament'),
          className: 'text-right',
          cell: (m) => (
            <span className="text-sm text-gray-500">
              {m.tournament_id ? (
                <a
                  href={`/tournaments/${m.tournament_id}`}
                  className="text-blue-600 hover:underline"
                >
                  #{m.tournament_id}
                </a>
              ) : (
                '🥸️'
              )}
            </span>
          ),
        },
      ]}
    />
  );
};

export const HistoryListMobile = ({ history }: { history: MatchHistory[] }) => {
  const { t } = useTranslation();

  const roundLabel: Record<string, string> = {
    SEMI_1: t('history.semi1'),
    SEMI_2: t('history.semi2'),
    LITTLE_FINAL: t('history.little_final'),
    FINAL: t('history.final'),
  };

  return (
    <DataCardList<MatchHistory>
      rows={history}
      rowKey={(m) => m.id}
      emptyMessage={t('history.empty')}
      renderCard={(m) => (
        <>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">
              {m.round ? (roundLabel[m.round] ?? m.round) : t('history.free_match')}
            </span>
            <span className="text-sm text-gray-500">
              {m.tournament_id ? `Tournament #${m.tournament_id}` : ''}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{new Date(m.created_at).toLocaleString()}</span>
            <span>
              {m.opponent_username ? `${t('history.opponent')}: ${m.opponent_username}` : ''}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-700">{m.username_player1}</span>
            <span className="font-bold text-teal-600 px-3">
              {m.score_player1 ?? '—'} – {m.score_player2 ?? '—'}
            </span>
            <span className="font-bold text-gray-700">{m.username_player2}</span>
          </div>
          {m.result && (
            <div className="text-sm font-semibold text-gray-700">
              {t('history.result')}: {m.result}
            </div>
          )}
          {m.username_winner && (
            <div className="text-sm font-medium text-emerald-600">🏆 {m.username_winner}</div>
          )}
        </>
      )}
    />
  );
};
