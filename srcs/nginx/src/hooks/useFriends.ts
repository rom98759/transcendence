import { useCallback, useEffect, useState } from 'react';
import {
  FriendshipUnifiedDTO,
  FrontendError,
  HTTP_STATUS,
  ProfileSimpleDTO,
} from '@transcendence/core';
import { friendApi } from '../api/friend-api';
import { useTranslation } from 'react-i18next';

export interface UseFriendsReturn {
  friends: FriendshipUnifiedDTO[];
  isLoading: boolean;
  error: string | null;
  addFriend: (user: ProfileSimpleDTO) => Promise<void>;
  removeFriend: (user: ProfileSimpleDTO) => Promise<void>;
  clearError: () => void;
  refresh: () => Promise<void>;
}

export function useFriends(): UseFriendsReturn {
  const { t } = useTranslation();
  const [friends, setFriends] = useState<FriendshipUnifiedDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await friendApi.getFriends();
      setFriends(data);
      setError(null);
    } catch (err) {
      if (err instanceof FrontendError) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const addFriend = useCallback(
    async (user: ProfileSimpleDTO) => {
      try {
        setError(null);
        await friendApi.addFriend(user.username);
        await fetchFriends();
      } catch (err) {
        if (err instanceof FrontendError) {
          if (err.statusCode === HTTP_STATUS.UNPROCESSABLE_ENTITY) {
            setError(t('errors.friend_self_add'));
          } else if (err.statusCode === HTTP_STATUS.CONFLICT) {
            setError(t('errors.friend_already'));
          } else {
            setError(err.message);
          }
        }
      }
    },
    [fetchFriends, t],
  );

  const removeFriend = useCallback(
    async (user: ProfileSimpleDTO) => {
      try {
        setError(null);
        await friendApi.removeFriend(user.username);
        await fetchFriends();
      } catch (err) {
        if (err instanceof FrontendError) {
          setError(err.message);
        }
      }
    },
    [fetchFriends],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    friends,
    isLoading,
    error,
    addFriend,
    removeFriend,
    clearError,
    refresh: fetchFriends,
  };
}
