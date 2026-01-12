import { useParams } from 'react-router-dom';
import Toggle from '../components/atoms/Toggle';
import FileUploader from '../components/molecules/FileUploader';
import { Page } from '../components/organisms/PageContainer';
import { useAuth } from '../components/helpers/AuthProvider';
import { ProfileAuthDTO } from '@transcendence/core';
import Avatar from '../components/atoms/Avatar';

const loadAvatar = () => {};

const toggle2FA = () => {};

export const ProfilePage = () => {
  const params = useParams();
  const userId = Number(params.userId);
  const { user: currentUser, isAdmin } = useAuth();
  const displayedUser = {
    authId: 2,
    username: 'titi',
    avatarUrl: 'bohr_sq.jpg',
  } as ProfileAuthDTO;
  const isOwner = currentUser && currentUser.authId === userId;
  // const isOwner = true;

  return (
    <Page className="flex flex-col">
      <div className="flex flex-col gap-4">
        {/* Public section */}
        <div className="mb-3">
          <h1 className="m-2 text-gray-600 font-bold text-xl font-quantico">Profile</h1>
          <div className="flex flex-col items-center">
            <Avatar src={displayedUser.avatarUrl} size="lg"></Avatar>
            <h2 className="mt-2 ts-form-title">{displayedUser.username}</h2>
          </div>
        </div>

        {/* Owner or Admin only section */}
        {(isOwner || isAdmin()) && (
          <>
            <div className="mb-3">
              <h1 className="m-2 text-gray-600 font-bold text-xl font-quantico">2FA</h1>
              <div className="flex flex-row justify-center">
                <Toggle onToggle={toggle2FA} className="mr-3"></Toggle>
                <label htmlFor="Toggle" className="text-gray-600">
                  disabled
                </label>
              </div>
            </div>

            <div className="mb-3">
              <h1 className="m-2 text-gray-600 font-bold text-xl font-quantico">Update avatar</h1>
              <div className="flex flex-row justify-center">
                <FileUploader onClick={loadAvatar}></FileUploader>
              </div>
            </div>
          </>
        )}
      </div>
    </Page>
  );
};
