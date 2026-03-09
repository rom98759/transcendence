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

  const menuItems = [
    { to: '/game', label: 'navbar.play', size: 140 },
    { to: '/friends', label: 'friends.friends', size: 140 },
    { to: '/stats', label: 'navbar.stats', size: 140 },
    { to: '/me', label: 'navbar.profile', size: 140 },
    { to: '/history', label: 'navbar.stats_history', size: 140 },
    { to: '/tournaments', label: 'navbar.play_tournament', size: 140 },
  ];
  const radius = 'clamp(145px, 14vw, 230px)';
  const angleStep = (2 * Math.PI) / menuItems.length;

  return (
    <div className="w-full h-screen overflow-hidden">
      <Background colorStart={colors.start} colorEnd={colors.end}>
        <div className="flex flex-col h-full">
          <NavBar />

          <main className="grow overflow-hidden">
            <Scrollable className="h-full flex items-center justify-center" isAnimated={true}>
              <div className="relative -translate-y-4 md:-translate-y-6 w-[min(90vw,470px)] h-[min(72vh,470px)] md:w-[min(86vw,620px)] md:h-[min(78vh,620px)]">
                {menuItems.map((item, index) => {
                  const angle = -Math.PI / 2 + index * angleStep;
                  const x = `calc(${Math.cos(angle)} * ${radius})`;
                  const y = `calc(${Math.sin(angle)} * ${radius})`;

                  return (
                    <div
                      key={item.to}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `calc(50% + ${x})`,
                        top: `calc(50% + ${y})`,
                      }}
                    >
                      <Link to={item.to} className="inline-flex items-center justify-center">
                        <CircleButton size={item.size} isMoving={true} className="m-1 p-3">
                          {t(item.label)}
                        </CircleButton>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </Scrollable>
          </main>
          <Footer />
        </div>
      </Background>
    </div>
  );
};
