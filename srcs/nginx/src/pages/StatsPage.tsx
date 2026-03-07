import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PlayerStat, StatsTableDesktop, StatsListMobile } from '../components/atoms/PlayerStats';
import api from '../api/api-client';

export const StatsPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const username = searchParams.get('username')?.trim() || null;

  const {
    data: stats = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['game-stats', username],
    queryFn: async () => {
      const { data } = await api.get<PlayerStat[]>('/game/stats', {
        params: username ? { username } : undefined,
      });
      return data;
    },
  });

  const mainStat = stats[0] ?? null;

  const bars = useMemo(
    () => [
      { label: t('stats.match_win_rate'), value: mainStat?.matchesWinRate ?? 0 },
      { label: t('stats.tournament_win_rate'), value: mainStat?.tournamentsWinRate ?? 0 },
      {
        label: t('stats.points_efficiency'),
        value:
          (mainStat?.points_scored ?? 0) + (mainStat?.points_conceded ?? 0) === 0
            ? 0
            : Number(
                (
                  ((mainStat?.points_scored ?? 0) * 100) /
                  ((mainStat?.points_scored ?? 0) + (mainStat?.points_conceded ?? 0))
                ).toFixed(2),
              ),
      },
    ],
    [mainStat, t],
  );

  if (isLoading) {
    return <div className="w-full text-center py-16 text-gray-500">{t('stats.loading_stats')}</div>;
  }

  if (isError) {
    return <div className="w-full text-center py-16 text-rose-500">{t('stats.error_loading')}</div>;
  }

  return (
    <div className="w-full px-4 py-8">
      {mainStat && (
        <div className="w-full mb-8">
          <div className="bg-white/70 rounded-3xl shadow-2xl p-6 border border-cyan-300">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-700 font-quantico text-center md:text-left">
                {username
                  ? t('stats.stats_for', { username: mainStat.username })
                  : t('stats.my_performance')}
              </h2>
              <span className="text-sm text-gray-500 text-center md:text-right">
                {t('stats.last_match')}:{' '}
                {mainStat.last_match_at ? new Date(mainStat.last_match_at).toLocaleString() : '—'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-500">{t('stats.matches')}</div>
                <div className="font-semibold text-gray-700">{mainStat.matches_played}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-500">{t('stats.wins_losses')}</div>
                <div className="font-semibold text-emerald-600">
                  {mainStat.matches_won} /{' '}
                  <span className="text-rose-500">{mainStat.matches_lost ?? 0}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-500">{t('stats.points')}</div>
                <div className="font-semibold text-gray-700">
                  {mainStat.points_scored ?? 0} - {mainStat.points_conceded ?? 0}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-500">{t('stats.tournaments')}</div>
                <div className="font-semibold text-gray-700">
                  {mainStat.tournaments_won} / {mainStat.tournaments_played}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {bars.map((bar) => (
                <div key={bar.label}>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{bar.label}</span>
                    <span>{bar.value} %</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-cyan-500 rounded-full"
                      style={{ width: `${Math.max(0, Math.min(100, bar.value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="hidden md:block w-full">
        <StatsTableDesktop stats={stats} />
      </div>
      <div className="md:hidden w-full">
        <StatsListMobile stats={stats} />
      </div>
    </div>
  );
};
