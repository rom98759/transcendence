// import { UserRow } from './UserRow';
import MenuElement from '../atoms/MenuElement';
import { MenuActions } from '../../types/react-types';
import { Link } from 'react-router-dom';
import { Locale } from '../atoms/Locale';
import { useAuth } from '../../providers/AuthProvider';
import Avatar from '../atoms/Avatar';
import { useTranslation } from 'react-i18next';

// const homeItems = [{ label: 'Home', href: '#' }];

// interface NavbarProps {
//   user: ProfileAuthDTO;
// }

export const NavBar = () => {
  const { user, isLoggedIn, logout } = useAuth();
  const { t } = useTranslation();

  const playItems = [
    { label: t('navbar.play_friend'), to: '/friends' },
    { label: t('navbar.play_ai'), to: '/ai' },
    { label: t('navbar.play_tournament'), to: '/tournament' },
  ];

  const statsItems = [
    { label: t('navbar.stats'), to: '/stats' },
    { label: t('navbar.stats_history'), to: '/history' },
  ];

  const profileItems = [
    { label: t('navbar.profile'), to: '/profile' },
    { label: t('navbar.profile_logout'), onClick: logout },
  ];

  return (
    <nav className="mb-3 bg-teal-800/30 p-5 w-full flex flex-row justify-between">
      <div className="lg:text-3xl text-xl group font-quantico[900] font-stretch-extra-expanded font-bold tracking-wider self-center uppercase">
        <span>Sp</span>
        <span className="lowercase inline-block duration-500 group-hover:rotate-180">i</span>
        <span>n Pong</span>
      </div>
      {user && isLoggedIn && (
        <>
          <MenuElement action={MenuActions.PLAY} items={playItems} scale={0.7}></MenuElement>
          <MenuElement action={MenuActions.STATS} items={statsItems}></MenuElement>
          <MenuElement action={MenuActions.PROFILE} items={profileItems}></MenuElement>
        </>
      )}

      <div className="flex flex-col items-center justify-around">
        {user && isLoggedIn && (
          <Link
            to="/me"
            className="hover:opacity-80 transition-opacity"
            style={{ textDecoration: 'non', color: 'inherit' }}
          >
            <Avatar key={user.avatarUrl} src={user.avatarUrl} size="sm"></Avatar>
            {/* <UserRow key={user.avatarUrl} avatarSize="sm" user={user}></UserRow> */}
          </Link>
        )}
        <Locale className="flex items-center" />
      </div>
    </nav>
  );
};
