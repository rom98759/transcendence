import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../providers/AuthProvider';
import { authApi } from '../api/auth-api';
import { FrontendError, ERROR_CODES, HTTP_STATUS } from '@transcendence/core';
import Button from '../components/atoms/Button';
import { Page } from '../components/organisms/PageContainer';
import i18next from 'i18next';

export const TwoFactorDisablePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoggedIn, isAuthChecked } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);

  // Rediriger si non connecté
  useEffect(() => {
    if (isAuthChecked && !isLoggedIn) {
      navigate('/login', { replace: true });
    }
  }, [isAuthChecked, isLoggedIn, navigate]);

  const handleDisable = async () => {
    setError(null);
    setSuccess(null);
    setIsDisabling(true);

    try {
      const result = await authApi.disable2FA();
      setSuccess(result.message || '2FA désactivée avec succès');

      // Rediriger après 2 secondes
      setTimeout(() => {
        navigate(user?.username ? `/profile/${user.username}` : '/', { replace: true });
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof FrontendError) {
        if (err.statusCode === HTTP_STATUS.BAD_REQUEST) {
          setError("La 2FA n'est pas activée sur ce compte");
        } else if (err.statusCode === HTTP_STATUS.UNAUTHORIZED) {
          setError('Vous devez être connecté pour désactiver la 2FA');
        } else if (err.code) {
          setError(
            i18next.t(`errors.${err.code}`) || i18next.t(`errors.${ERROR_CODES.INTERNAL_ERROR}`),
          );
        } else {
          setError(err.message || 'Erreur lors de la désactivation');
        }
      } else {
        setError(i18next.t(`errors.${ERROR_CODES.INTERNAL_ERROR}`));
      }
    } finally {
      setIsDisabling(false);
    }
  };

  if (!isAuthChecked) {
    return null; // Ou un loader
  }

  return (
    <Page>
      <div className="max-w-md mx-auto bg-white/10 backdrop-blur-md rounded-xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Désactiver la 2FA</h1>
          <p className="text-gray-300">Gérez la sécurité de votre compte</p>
        </div>

        {!success && (
          <>
            <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="text-yellow-200 text-sm space-y-2">
                  <p className="font-semibold">Attention :</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Vous devez être connecté pour désactiver la 2FA</li>
                    <li>Votre compte sera moins sécurisé sans 2FA</li>
                    <li>Vous pourrez réactiver la 2FA à tout moment</li>
                  </ul>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
                <p className="text-red-200 text-sm text-center">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <Button
                onClick={handleDisable}
                disabled={isDisabling}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {isDisabling ? 'Désactivation...' : 'Désactiver la 2FA'}
              </Button>

              <button
                onClick={() => navigate(user?.username ? `/profile/${user.username}` : '/')}
                className="w-full text-sm text-gray-400 hover:text-white transition-colors"
              >
                ← Annuler
              </button>
            </div>
          </>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-6 text-center space-y-3">
            <div className="text-5xl">✓</div>
            <p className="text-green-200 font-semibold">{success}</p>
            <p className="text-gray-300 text-sm">Redirection en cours...</p>
          </div>
        )}
      </div>
    </Page>
  );
};
