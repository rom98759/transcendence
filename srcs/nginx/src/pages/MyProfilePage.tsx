import FileUploader from '../components/molecules/FileUploader';
import { Page } from '../components/organisms/PageContainer';
import { TwoFactorSetup } from '../components/organisms/TwoFactorSetup';
import Avatar from '../components/atoms/Avatar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api/profile-api';
import { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useTranslation } from 'react-i18next';

/**
 * MyProfilePage — Page privée accessible uniquement via /me.
 *
 * Responsabilités :
 * - Affiche les informations personnelles de l'utilisateur connecté
 * - Permet la modification du profil (avatar, 2FA, etc.)
 *
 * Guard : PrivateRoute redirige vers /welcome si non connecté.
 */
export const MyProfilePage = () => {
  const queryClient = useQueryClient();
  const { user: authUser, updateUser } = useAuth();
  const { t } = useTranslation();

  const username = authUser?.username || '';

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['username', username],
    queryFn: () => profileApi.getProfileByUsername(username),
    enabled: !!username,
  });

  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  if (isLoading) {
    return (
      <Page>
        <div>{t('global.loading')}</div>
      </Page>
    );
  }

  if (isError || !profile || username === '') {
    return (
      <Page>
        <div>{t('global.not_found')}</div>
      </Page>
    );
  }

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const updatedProfile = await profileApi.updateAvatar(username, file, (p: number) =>
        setProgress(p),
      );
      queryClient.invalidateQueries({ queryKey: ['username', username] });
      if (authUser) {
        updateUser({
          ...authUser,
          avatarUrl: updatedProfile.avatarUrl,
        });
      }
    } catch (error: unknown) {
      alert('failed upload ' + error); // TODO modal
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Page className="flex flex-col">
      <div className="flex flex-col gap-4">
        {/* Section profil */}
        <div className="mb-3">
          <h1 className="m-2 text-gray-600 font-bold text-xl font-quantico">
            {t('profile.profile')}
          </h1>
          <div className="flex flex-col items-center">
            <Avatar src={profile.avatarUrl} size="lg"></Avatar>
            <h2 className="mt-2 ts-form-title">{profile.username}</h2>
          </div>
        </div>

        {/* Section 2FA */}
        <div className="mb-3">
          <h1 className="m-2 text-gray-600 font-bold text-xl font-quantico">{t('profile.2fa')}</h1>
          <TwoFactorSetup />
        </div>

        {/* Section upload avatar */}
        <div className="mb-3">
          <h1 className="m-2 text-gray-600 font-bold text-xl font-quantico">
            {t('profile.update_avatar')}
          </h1>
          <div className="flex flex-row justify-center">
            <FileUploader onFileSelect={handleUpload}></FileUploader>
          </div>
          {isUploading && (
            <div className="w-full bg-gray-200 h-2 mt-4">
              <div
                className="bg-blue-600 h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </Page>
  );
};
