import { useTranslation } from 'react-i18next';
import { CircleButton } from '../components/atoms/CircleButton';
import Scrollable from '../components/atoms/Scrollable';
import { Link } from 'react-router-dom';
import FriendSidebar from '../components/organisms/FriendSidebar';

/**
 * HomePage — Page d'accueil pour les utilisateurs authentifiés.
 * Layout (Background + NavBar + Footer) fourni par AppLayout.
 */
export const HomePage = () => {
  const { t } = useTranslation();

  return (
    <>
      <FriendSidebar />
      <Scrollable
        className="md:grid md:grid-cols-2 md:place-items-center"
        divClassName="mt-0"
        isAnimated={true}
      >
        <Link to="/game/pong-ai">
          <CircleButton size={220} isMoving={true}>
            {t('game.playWithAI')}
          </CircleButton>
        </Link>
        <Link to="/game/simple-game">
          <CircleButton size={280} isMoving={true}>
            {t('game.playWithFriends')}
          </CircleButton>
        </Link>
        <Link className="md:col-span-2" to="/game/tournament">
          <CircleButton className="md:col-span-2" size={250} isMoving={true}>
            {t('game.tournament')}
          </CircleButton>
        </Link>
      </Scrollable>
    </>
  );
};
