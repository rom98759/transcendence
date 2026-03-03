import { useParams } from 'react-router-dom';
import { Page } from '../components/organisms/PageContainer';
import UserIdentity from '../components/atoms/UserIdentity';
import { useQuery } from '@tanstack/react-query';
import { profileApi } from '../api/profile-api';
import { useTranslation } from 'react-i18next';

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
      <div className="flex flex-col gap-4">
        <div className="mb-3">
          <h1 className="m-2 text-gray-600 font-bold text-xl font-quantico">
            {t('profile.profile')}
          </h1>
          <div className="flex flex-col items-center">
            <UserIdentity
              username={profile.username}
              avatarUrl={profile.avatarUrl}
              isOnline={profile.isOnline}
              size="lg"
              direction="col"
              dotBorderClass="border-white"
              nameClassName="mt-1 ts-form-title"
            />
            <span
              className={`text-xs font-quantico mt-1 ${profile.isOnline ? 'text-emerald-400' : 'text-gray-500'}`}
            >
              {profile.isOnline ? t('friends.online') : t('friends.offline')}
            </span>
          </div>
        </div>
      </div>
    </Page>
  );
};
