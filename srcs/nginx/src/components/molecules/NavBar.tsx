import { Link, useLocation } from 'react-router-dom';
import { UserRow } from './UserRow';
import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../../utils/errors';
import { UserProfileDTO } from '../../schemas/profile.schema';

export const NavBar = () => {
  const [user, setUser] = useState<UserProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = {
        username: 'toto',
        avatarUrl: 'default.png',
      };
      setUser(data);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const location = useLocation();

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-12 w-12 rounded-full bg-slate-800 animate-pulse"></div>
        <div className="h-4 w-40 bg-slate-800 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-red-400">Unable to load your profile</p>
        <p className="text=xs text-slate-400">{error}</p>
        <button className="px-3 py-1"></button>
      </div>
    );
  }

  if (!user) return null;

  const isActive = (path: string) =>
    location.pathname === path ? 'text-cyan-400' : 'text-slate-300';
  return (
    <header>
      <nav className="p-2 w-full flex flex-row justify-evenly">
        <div className="flex items-center text-sm">
          <Link to="/me" className={isActive('/me')}>
            My Profile
          </Link>
        </div>
        <UserRow avatarSize="sm" user={user}></UserRow>
      </nav>
    </header>
  );
};
