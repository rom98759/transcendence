import MenuElement from '../atoms/MenuElement';
import { MenuActions } from '../../types/react-types';
import { Link, useNavigate } from 'react-router-dom';
import { Locale } from '../atoms/Locale';
import { useAuth } from '../../providers/AuthProvider';
import Avatar from '../atoms/Avatar';
import { useTranslation } from 'react-i18next';

export const NavBar = () => {
  const { user, isLoggedIn, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const playItems = [
    { label: t('navbar.play_friend'), to: '/friends' },
    { label: t('navbar.play_ai'), to: '/game/pong-ai' },
    { label: t('navbar.play_tournament'), to: '/tournaments' },
    { label: t('navbar.play_remote'), to: '/game/remote' },
    { label: t('navbar.play_local'), to: '/game/local' },
  ];

  const statsItems = [
    { label: t('navbar.stats'), to: '/stats' },
    { label: t('navbar.stats_history'), to: '/history' },
  ];

  const profileItems = [
    { label: t('navbar.profile'), to: '/me' },
    { label: t('faq.title'), to: '/faq' },
    { label: t('navbar.profile_logout'), onClick: () => logout() },
  ];

  return (
    <nav
      className={`mb-2 bg-teal-800/30 p-5 w-full flex flex-row sm:gap-4 ${!isLoggedIn ? 'justify-center' : 'justify-between'}`}
    >
      <div className="lg:text-3xl hidden sm:block group font-quantico[900] font-stretch-extra-expanded font-bold tracking-wider self-center uppercase">
        <Link to="/home">
          <span>Sp</span>
          <span className="lowercase inline-block duration-500 group-hover:rotate-180">i</span>
          <span>n Pong</span>
        </Link>
      </div>
      {user && isLoggedIn && (
        <>
          <MenuElement action={MenuActions.PLAY} items={playItems} scale={0.7} />
          <MenuElement action={MenuActions.STATS} items={statsItems} />
          <MenuElement action={MenuActions.PROFILE} items={profileItems} />
        </>
      )}

      <div className="flex flex-col items-center justify-around">
        {user && isLoggedIn && (
          <Link
            to="/me"
            className="hover:opacity-80 transition-opacity"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Avatar key={user.avatarUrl} src={user.avatarUrl} size="sm"></Avatar>
          </Link>
        )}

        <div className="flex flex-row items-center justify-center">
          <Locale className="mt-1 flex justify-center items-center" />
        </div>
      </div>
    </nav>
  );
};
