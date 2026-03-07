import { Link } from 'react-router-dom';
import Background from '../components/atoms/Background';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../providers/AuthProvider';

const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

/**
 * NotFoundPage — Catch-all pour les URLs non reconnues.
 *
 * Affiche un message 404 avec un lien de retour contextuel :
 * - Authentifié → /home
 * - Non authentifié → /welcome
 */
export const NotFoundPage = () => {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();

  const homePath = isLoggedIn ? '/home' : '/welcome';

  return (
    <div className="w-full h-full relative">
      <Background
        grainIntensity={4}
        baseFrequency={0.28}
        colorStart={colors.start}
        colorEnd={colors.end}
      >
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <h1 className="text-8xl font-bold font-quantico text-teal-400">404</h1>
          <p className="text-xl text-gray-300">{t('global.not_found')}</p>
          <Link
            to={homePath}
            className="mt-4 px-6 py-3 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition-colors"
          >
            {t('navbar.home')}
          </Link>
        </div>
      </Background>
    </div>
  );
};
