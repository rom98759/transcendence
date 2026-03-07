import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  MatchHistory,
  HistoryTableDesktop,
  HistoryListMobile,
} from '../components/atoms/MatchHistory';
import api from '../api/api-client';

export const HistoryPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const username = searchParams.get('username')?.trim() || null;

  const {
    data: history = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['game-history', username],
    queryFn: async () => {
      const { data } = await api.get<MatchHistory[]>('/game/history', {
        params: username ? { username } : undefined,
      });
      return data;
    },
  });

  const summary = useMemo(() => {
    const wins = history.filter((m) => m.result === 'WIN').length;
    const losses = history.filter((m) => m.result === 'LOSS').length;
    const pending = history.filter((m) => m.result === 'PENDING' || !m.result).length;
    const tournaments = new Set(history.filter((m) => m.tournament_id).map((m) => m.tournament_id))
      .size;
    return { wins, losses, pending, tournaments };
  }, [history]);

  if (isLoading) {
    return (
      <div className="w-full text-center py-16 text-gray-500">{t('history.loading_history')}</div>
    );
  }

  if (isError) {
    return (
      <div className="w-full text-center py-16 text-rose-500">{t('history.error_loading')}</div>
    );
  }

  return (
    <div className="w-full px-4 py-8">
      <div className="w-full mb-8">
        <div className="bg-white/70 rounded-3xl shadow-2xl p-6 border border-cyan-300">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-700 font-quantico text-center md:text-left">
              {username ? t('history.history_for', { username }) : t('history.my_history')}
            </h2>
            <span className="text-sm text-gray-500 text-center md:text-right">
              {t('history.matches_count', { count: history.length })}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-500">{t('history.wins')}</div>
              <div className="font-semibold text-emerald-600">{summary.wins}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-500">{t('history.losses')}</div>
              <div className="font-semibold text-rose-500">{summary.losses}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-500">{t('history.pending')}</div>
              <div className="font-semibold text-amber-600">{summary.pending}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-500">{t('history.tournaments')}</div>
              <div className="font-semibold text-gray-700">{summary.tournaments}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:block w-full">
        <HistoryTableDesktop history={history} />
      </div>
      <div className="md:hidden w-full">
        <HistoryListMobile history={history} />
      </div>
    </div>
  );
};
