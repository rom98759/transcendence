import { useTranslation } from 'react-i18next';
import { Page } from '../components/organisms/PageContainer';
import { useFriends } from '../hooks/useFriends';
import FriendListPanel from '../components/molecules/FriendListPanel';

export const FriendsPage = () => {
  const { t } = useTranslation();
  const { friends, isLoading, error, addFriend, removeFriend, clearError } = useFriends();

  return (
    <Page className="flex flex-col" title={t('friends.friends')}>
      <div className="w-full max-w-lg mx-auto">
        <FriendListPanel
          friends={friends}
          isLoading={isLoading}
          error={error}
          onAddFriend={addFriend}
          onRemoveFriend={removeFriend}
          onClearError={clearError}
          variant="full"
        />
      </div>
    </Page>
  );
};
