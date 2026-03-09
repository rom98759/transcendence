import { useEffect, useRef, useState } from 'react';
import UserRow from './UserRow';
import { ERROR_CODES, FrontendError, ProfileSimpleDTO } from '@transcendence/core';
import UserSearchInput from './UserSearchInput';
import { profileApi } from '../../api/profile-api';
import { useTranslation } from 'react-i18next';
import { UserActions } from '../../types/react-types';
import { useOutsideClick } from '../../hooks/useOutsideClick';

const useUserSearch = (query: string) => {
  const [results, setResults] = useState<ProfileSimpleDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { t } = useTranslation();
  useEffect(() => {
    let isMounted = true;
    setError(null);
    const fetchProfiles = async () => {
      if (query.length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = await profileApi.getLike(query);
        if (isMounted) {
          setResults(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (!isMounted) return;
        setResults([]);
        setError(
          err instanceof FrontendError ? err.message : t(`errors.${ERROR_CODES.INTERNAL_ERROR}`),
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    const timeoutId = setTimeout(fetchProfiles, 300);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [query, t]);

  return { results, error, isLoading };
};

interface UserSearchContainerProps {
  isSearch: boolean;
  actions: UserActions[];
  onAction?: (action: UserActions, user: ProfileSimpleDTO) => void;
}

const UserSearchContainer = ({ isSearch, actions, onAction }: UserSearchContainerProps) => {
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<ProfileSimpleDTO | null>(null);
  const { results, error, isLoading } = useUserSearch(query); // Hook défini précédemment

  const containerRef = useRef<HTMLDivElement>(null);

  const resetSearch = () => {
    setSelectedUser(null);
    setQuery('');
  };
  useOutsideClick(containerRef, () => {
    if (selectedUser) {
      resetSearch();
    }
  });
  if (selectedUser || !isSearch) {
    return (
      <div ref={containerRef}>
        <UserRow
          actions={actions}
          user={selectedUser}
          avatarSize="md"
          onAction={(action, user) => {
            onAction?.(action, user);
            setSelectedUser(null);
            setQuery('');
          }}
        />
      </div>
    );
  }

  return (
    <>
      <UserSearchInput
        isLoading={isLoading}
        value={query}
        error={error}
        onChange={(val) => {
          setQuery(val);
        }}
        suggestions={results}
        onSelect={setSelectedUser}
      />
    </>
  );
};

export default UserSearchContainer;
