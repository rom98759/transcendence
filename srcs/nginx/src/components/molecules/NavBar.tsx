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
    { label: t('navbar.play_ai'), to: '/ai' },
    { label: t('navbar.play_tournament'), to: '/tournaments' },
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
      className={`bg-teal-800/30 px-2 py-2 sm:px-4 sm:py-3 w-full flex flex-row gap-2 sm:gap-4 ${!isLoggedIn ? 'justify-center' : 'justify-between'}`}
    >
      <div className="text-lg sm:text-xl lg:text-2xl hidden sm:block group font-quantico[900] font-stretch-extra-expanded font-bold tracking-wide self-center uppercase">
        <Link to="/home" className="hover:opacity-80 transition-opacity">
          <span>Sp</span>
          <span className="lowercase inline-block duration-500 group-hover:rotate-180">i</span>
          <span>n Pong</span>
        </Link>
      </div>
      {user && isLoggedIn && (
        <>
          <MenuElement
            action={MenuActions.PLAY}
            items={playItems}
            scale={0.7}
            onClick={() => navigate('/game/local')}
          />
          <MenuElement
            action={MenuActions.STATS}
            items={statsItems}
            onClick={() => navigate('/stats')}
          />
          <MenuElement
            action={MenuActions.PROFILE}
            items={profileItems}
            onClick={() => navigate('/me')}
          />
        </>
      )}

      <div className="flex flex-row gap-2 items-center">
        <div className="flex items-center">
          <Locale className="flex justify-center items-center" />
        </div>
        {user && isLoggedIn && (
          <Link
            to="/me"
            className="hover:opacity-80 transition-opacity"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Avatar key={user.avatarUrl} src={user.avatarUrl} size="sm"></Avatar>
          </Link>
        )}
      </div>
    </nav>
  );
};
