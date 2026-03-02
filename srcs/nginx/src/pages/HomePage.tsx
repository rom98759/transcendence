import { NavBar } from '../components/molecules/NavBar';
import Background from '../components/atoms/Background';
import { useTranslation } from 'react-i18next';
import { CircleButton } from '../components/atoms/CircleButton';
import Scrollable from '../components/atoms/Scrollable';
import { Link } from 'react-router-dom';
import { Footer } from '../components/molecules/Footer';

const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

/**
 * HomePage — Page d'accueil pour les utilisateurs authentifiés.
 * Responsabilités :
 * - Affiche les options principales du site (jouer, tournois, etc.)
 */
export const HomePage = () => {
  const { t } = useTranslation();

  return (
    <div className="w-full h-full relative">
      <Background
        grainIntensity={4}
        baseFrequency={0.28}
        colorStart={colors.start}
        colorEnd={colors.end}
      >
        <NavBar />
        <div className="flex flex-col justify-around">
          <Scrollable
            className="h-[90vh] md:grid md:grid-cols-2 md:place-items-center"
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
            <Footer className="z-15"></Footer>
          </Scrollable>
        </div>
      </Background>
    </div>
  );
};
