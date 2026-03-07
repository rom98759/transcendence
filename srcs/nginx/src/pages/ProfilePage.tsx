import { Link, useParams } from 'react-router-dom';
import { Page } from '../components/organisms/PageContainer';
import Avatar from '../components/atoms/Avatar';
import { useQuery } from '@tanstack/react-query';
import { profileApi } from '../api/profile-api';
import { useTranslation } from 'react-i18next';
import api from '../api/api-client';
import { PlayerStat } from '../components/atoms/PlayerStats';
import { MatchHistory } from '../components/atoms/MatchHistory';

/**
 * ProfilePage — Page protégée accessible via /profile/:username.
 *
 * Guard : PrivateRoute — seuls les utilisateurs connectés peuvent voir les profils.
 *
 * Responsabilités :
 * - Affiche les informations d'un utilisateur
 * - Aucune modification possible
 */
export const ProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { t } = useTranslation();

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['username', username],
    queryFn: () => profileApi.getProfileByUsername(username!),
    enabled: !!username,
  });

  const { data: stats = [], isLoading: isStatsLoading } = useQuery({
    queryKey: ['profile-stats', username],
    queryFn: async () => {
      const { data } = await api.get<PlayerStat[]>('/game/stats', { params: { username } });
      return data;
    },
    enabled: !!username,
  });

  const { data: history = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ['profile-history', username],
    queryFn: async () => {
      const { data } = await api.get<MatchHistory[]>('/game/history', {
        params: { username, limit: 5 },
      });
      return data;
    },
    enabled: !!username,
  });

  const mainStat = stats[0] ?? null;

  if (isLoading) {
    return (
      <Page>
        <div>{t('global.loading')}</div>
      </Page>
    );
  }

  if (isError || !profile || !username) {
    return (
      <Page>
        <div>{t('global.not_found')}</div>
      </Page>
    );
  }

  return (
    <Page className="flex flex-col">
      <div className="w-full max-w-4xl mx-auto px-4 md:px-0 py-6 flex flex-col gap-5">
        <div className="mb-1">
          <h1 className="m-2 text-gray-600 font-bold text-2xl font-quantico text-center">
            {t('profile.profile')}
          </h1>
          <div className="flex flex-col items-center gap-2">
            <Avatar src={profile.avatarUrl} size="lg"></Avatar>
            <h2 className="mt-2 ts-form-title">{profile.username}</h2>
          </div>
        </div>

        <div className="bg-white/70 rounded-2xl p-5 border border-cyan-200 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <h3 className="font-semibold text-gray-700">{t('profile.game_insights')}</h3>
            <div className="flex gap-3 text-sm justify-center md:justify-end">
              <Link
                to={`/stats?username=${encodeURIComponent(profile.username)}`}
                className="text-cyan-700 hover:underline"
              >
                {t('profile.view_stats')}
              </Link>
              <Link
                to={`/history?username=${encodeURIComponent(profile.username)}`}
                className="text-cyan-700 hover:underline"
              >
                {t('profile.view_history')}
              </Link>
            </div>
          </div>

          {isStatsLoading ? (
            <p className="text-sm text-gray-500">{t('stats.loading_stats')}</p>
          ) : mainStat ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">{t('stats.matches')}</div>
                  <div className="font-semibold text-gray-700">{mainStat.matches_played}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">{t('stats.match_win_rate')}</div>
                  <div className="font-semibold text-cyan-600">{mainStat.matchesWinRate}%</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">{t('stats.tournaments')}</div>
                  <div className="font-semibold text-gray-700">
                    {mainStat.tournaments_won}/{mainStat.tournaments_played}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">{t('stats.points')}</div>
                  <div className="font-semibold text-gray-700">
                    {mainStat.points_scored ?? 0}/{mainStat.points_conceded ?? 0}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{t('profile.match_performance')}</span>
                  <span>{mainStat.matchesWinRate}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-cyan-500 rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, mainStat.matchesWinRate))}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">{t('profile.no_stats_available')}</p>
          )}
        </div>

        <div className="bg-white/70 rounded-2xl p-5 border border-cyan-200 shadow-xl mb-8">
          <h3 className="font-semibold text-gray-700 mb-3">{t('profile.recent_matches')}</h3>
          {isHistoryLoading ? (
            <p className="text-sm text-gray-500">{t('profile.loading_history')}</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500">{t('profile.no_recent_matches')}</p>
          ) : (
            <div className="space-y-2">
              {history.map((match) => (
                <div
                  key={match.id}
                  className="bg-gray-50 rounded-lg p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-700 truncate">
                      {match.username_player1} {match.score_player1 ?? '—'} -{' '}
                      {match.score_player2 ?? '—'} {match.username_player2}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(match.created_at).toLocaleString()}{' '}
                      {match.tournament_id ? `• #${match.tournament_id}` : ''}
                    </div>
                  </div>
                  <div
                    className={`text-xs font-semibold ${
                      match.result === 'WIN'
                        ? 'text-emerald-600'
                        : match.result === 'LOSS'
                          ? 'text-rose-500'
                          : 'text-amber-600'
                    }`}
                  >
                    {match.result === 'WIN'
                      ? t('history.result_win')
                      : match.result === 'LOSS'
                        ? t('history.result_loss')
                        : t('history.result_pending')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Page>
  );
};
