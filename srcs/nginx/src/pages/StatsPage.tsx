import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PlayerStat, StatsTableDesktop, StatsListMobile } from '../components/atoms/PlayerStats';
import api from '../api/api-client';

/** Individual player card with progress bars (used when ?username= is specified) */
const PlayerCard = ({
  stat,
  username,
  t,
}: {
  stat: PlayerStat;
  username: string | null;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) => {
  const bars = useMemo(
    () => [
      { label: t('stats.match_win_rate'), value: stat.matchesWinRate ?? 0 },
      { label: t('stats.tournament_win_rate'), value: stat.tournamentsWinRate ?? 0 },
      {
        label: t('stats.points_efficiency'),
        value:
          (stat.points_scored ?? 0) + (stat.points_conceded ?? 0) === 0
            ? 0
            : Number(
                (
                  ((stat.points_scored ?? 0) * 100) /
                  ((stat.points_scored ?? 0) + (stat.points_conceded ?? 0))
                ).toFixed(2),
              ),
      },
    ],
    [stat, t],
  );

  return (
    <div className="w-full mb-8">
      <div className="bg-white/70 rounded-3xl shadow-2xl p-6 border border-cyan-300">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-700 font-quantico text-center md:text-left">
            {username
              ? t('stats.stats_for', { username: stat.username })
              : t('stats.my_performance')}
          </h2>
          <span className="text-sm text-gray-500 text-center md:text-right">
            {t('stats.last_match')}:{' '}
            {stat.last_match_at ? new Date(stat.last_match_at).toLocaleString() : '—'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500">{t('stats.matches')}</div>
            <div className="font-semibold text-gray-700">{stat.matches_played}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500">{t('stats.wins_losses')}</div>
            <div className="font-semibold text-emerald-600">
              {stat.matches_won} / <span className="text-rose-500">{stat.matches_lost ?? 0}</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500">{t('stats.points')}</div>
            <div className="font-semibold text-gray-700">
              {stat.points_scored ?? 0} - {stat.points_conceded ?? 0}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500">{t('stats.tournaments')}</div>
            <div className="font-semibold text-gray-700">
              {stat.tournaments_won} / {stat.tournaments_played}
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
  );
};

export const StatsPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const username = searchParams.get('username')?.trim() || null;

  const isGlobalLeaderboard = !username;

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

  if (isLoading) {
    return <div className="w-full text-center py-16 text-gray-500">{t('stats.loading_stats')}</div>;
  }

  if (isError) {
    return <div className="w-full text-center py-16 text-rose-500">{t('stats.error_loading')}</div>;
  }

  // ── Global leaderboard mode (no username param) ──
  if (isGlobalLeaderboard) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white/70 rounded-3xl shadow-2xl p-8 border border-cyan-300">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-700 font-quantico mb-6 text-center">
            {t('stats.leaderboard')}
          </h1>

          {stats.length === 0 ? (
            <div className="text-center py-16 text-gray-500">{t('stats.empty')}</div>
          ) : (
            <>
              {/* Podium — top 3 */}
              <div className="flex flex-col sm:flex-row items-end justify-center gap-4 mb-10">
                {stats.slice(0, 3).map((s, idx) => {
                  const rank = idx + 1;
                  const podiumStyles = [
                    'order-2 sm:order-2 bg-gradient-to-b from-yellow-300 to-yellow-500 h-36',
                    'order-1 sm:order-1 bg-gradient-to-b from-gray-300 to-gray-400 h-28',
                    'order-3 sm:order-3 bg-gradient-to-b from-orange-300 to-orange-500 h-24',
                  ];
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div
                      key={s.player_id}
                      className={`flex flex-col items-center w-full sm:w-40 ${rank === 1 ? 'order-2 sm:order-2' : rank === 2 ? 'order-1 sm:order-1' : 'order-3 sm:order-3'}`}
                    >
                      <span className="text-3xl mb-1">{medals[idx]}</span>
                      <span className="font-bold text-gray-700 text-lg truncate max-w-full">
                        {s.username}
                      </span>
                      <span className="text-sm text-gray-500 mb-2">
                        {s.matchesWinRate}% {t('stats.matches_win_rate').toLowerCase()}
                      </span>
                      <div
                        className={`${podiumStyles[idx]} w-full rounded-t-xl flex items-center justify-center`}
                      >
                        <span className="text-white font-bold text-2xl">#{rank}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Full ranking table */}
              <div className="hidden md:block w-full">
                <StatsTableDesktop stats={stats} showRank />
              </div>
              <div className="md:hidden w-full">
                <StatsListMobile stats={stats} showRank />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Individual player mode (?username=xxx) ──
  return (
    <div className="w-full px-4 py-8">
      {mainStat && <PlayerCard stat={mainStat} username={username} t={t} />}

      <div className="hidden md:block w-full">
        <StatsTableDesktop stats={stats} />
      </div>
      <div className="md:hidden w-full">
        <StatsListMobile stats={stats} />
      </div>
    </div>
  );
};
