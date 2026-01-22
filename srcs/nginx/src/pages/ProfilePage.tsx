import { useParams } from 'react-router-dom';
import Toggle from '../components/atoms/Toggle';
import FileUploader from '../components/molecules/FileUploader';
import { Page } from '../components/organisms/PageContainer';
import { useAuth } from '../components/helpers/AuthProvider';
import Avatar from '../components/atoms/Avatar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api/profile-api';
import { useState } from 'react';

const toggle2FA = () => {};

// sources https://omarshishani.medium.com/how-to-upload-images-to-a-server-with-react-and-express-%EF%B8%8F-cbccf0ca3ac9
// source https://www.bezkoder.com/upload-image-react-typescript/
// TODO have auth getUserById endpoint to provide role and email
export const ProfilePage = () => {
  const params = useParams();
  const queryClient = useQueryClient();
  const username = params.username || 'Toto';
  const { user: authUser, updateUser } = useAuth();
  const {
    data: displayedUser,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['username', username],
    queryFn: () => {
      return profileApi.getProfileByUsername(username!);
    },
    enabled: !!username,
    // enabled: !!username && !!authUser,
  });

  const isOwner = authUser && authUser.username === username;
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  if (isLoading) {
    return (
      <Page>
        <div>Loading...</div>
      </Page>
    );
  }

  if (isError || !displayedUser) {
    return (
      <Page>
        <div>404 not found</div>
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
      if (isOwner && authUser) {
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
        {/* Public section */}
        <div className="mb-3">
          <h1 className="m-2 text-gray-600 font-bold text-xl font-quantico">Profile</h1>
          <div className="flex flex-col items-center">
            <Avatar src={displayedUser.avatarUrl} size="lg"></Avatar>
            <h2 className="mt-2 ts-form-title">{displayedUser.username}</h2>
          </div>
        </div>

        {/* Owner or Admin only section */}
        {isOwner && (
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
          </>
        )}
      </div>
    </Page>
  );
};
