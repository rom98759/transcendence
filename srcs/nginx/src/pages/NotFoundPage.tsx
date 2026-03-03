import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../providers/AuthProvider';
import { Page } from '../components/organisms/PageContainer';

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
    <Page>
      <div className="flex flex-col items-center justify-center gap-6">
        <h1 className="text-8xl font-bold font-quantico text-teal-400">404</h1>
        <p className="text-xl text-gray-300">{t('global.not_found', 'Page not found')}</p>
        <Link
          to={homePath}
          className="mt-4 px-6 py-3 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition-colors"
        >
          {t('navbar.home', 'Home')}
        </Link>
      </div>
    </Page>
  );
};
