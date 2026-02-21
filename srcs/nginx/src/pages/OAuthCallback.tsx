/**
 * OAuthCallback - Page de traitement des callbacks OAuth 2.0
 *
 * Appelée après redirection depuis Google ou 42 School.
 * Extrait le code d'autorisation de l'URL et l'échange contre un JWT
 * via le service auth, puis redirige l'utilisateur.
 *
 * Flow :
 * 1. Provider redirige → /auth/oauth/:provider/callback?code=...
 * 2. Cette page extrait le code et l'envoie au service auth (POST)
 * 3. Le service auth échange le code contre un profil utilisateur
 * 4. Un JWT est généré et stocké dans un cookie httpOnly
 * 5. checkAuth() rafraîchit le contexte utilisateur
 * 6. Redirection vers dashboard (utilisateur existant) ou profil (nouveau compte)
 */

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../providers/AuthProvider';
import { authApi } from '../api/auth-api';
import { FrontendError } from '@transcendence/core';

type CallbackStatus = 'loading' | 'success' | 'error';

interface CallbackState {
  status: CallbackStatus;
  message?: string;
  error?: string;
}

const VALID_PROVIDERS = ['google', 'school42'] as const;
type ValidProvider = (typeof VALID_PROVIDERS)[number];

function isValidProvider(p: string | undefined): p is ValidProvider {
  return VALID_PROVIDERS.includes(p as ValidProvider);
}

export const OAuthCallback = () => {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, checkAuth } = useAuth();
  const { t } = useTranslation();
  const hasRun = useRef(false);

  const [callbackState, setCallbackState] = useState<CallbackState>({
    status: 'loading',
    message: t('oauth.checking'),
  });

  useEffect(() => {
    // Strict Mode guard : évite le double appel en développement
    if (hasRun.current) return;
    hasRun.current = true;

    const handleCallback = async () => {
      // Validation du provider
      if (!isValidProvider(provider)) {
        setCallbackState({
          status: 'error',
          error: t('oauth.error_invalid_provider', { provider: provider ?? 'unknown' }),
        });
        return;
      }

      // Erreur retournée directement par le provider (refus utilisateur, etc.)
      const providerError = searchParams.get('error');
      if (providerError) {
        const description = searchParams.get('error_description') ?? providerError;
        setCallbackState({ status: 'error', error: description });
        return;
      }

      const code = searchParams.get('code');
      if (!code) {
        setCallbackState({ status: 'error', error: t('oauth.error_missing_code') });
        return;
      }

      const oauthState = searchParams.get('state') ?? undefined;

      // Vérification CSRF : le state doit correspondre à ce qu'on a généré
      const storedState = sessionStorage.getItem(`oauth_state_${provider}`);
      if (oauthState && storedState && oauthState !== storedState) {
        setCallbackState({ status: 'error', error: t('oauth.error_state_mismatch') });
        return;
      }
      sessionStorage.removeItem(`oauth_state_${provider}`);

      setCallbackState({
        status: 'loading',
        message: t('oauth.connecting_provider', { provider }),
      });

      try {
        const result = await authApi.oauthCallback(provider, { code, state: oauthState });

        const successMessage = result.isNewUser
          ? t('oauth.success_new_user', { provider })
          : t('oauth.success_login', { provider });

        // 1. Mettre à jour le contexte immédiatement (même workflow que LoginForm)
        login({ username: result.username, avatarUrl: null });

        // 2. Vérification secondaire : s'assurer que le cookie JWT est bien accepté
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
          setCallbackState({
            status: 'error',
            error: t('errors.unauthorized'),
          });
          return;
        }

        setCallbackState({ status: 'success', message: successMessage });

        // Redirection identique au login classique (toujours vers le profil)
        setTimeout(() => navigate(`/profile/${result.username}`, { replace: true }), 1500);
      } catch (err: unknown) {
        // L'intercepteur api-client transforme toutes les erreurs en FrontendError
        const errorMessage =
          err instanceof FrontendError ? err.message : t('oauth.error_generic', { provider });

        setCallbackState({ status: 'error', error: errorMessage });
      }
    };

    handleCallback();
  }, [provider, searchParams, navigate, login, checkAuth, t]);

  const handleRetry = () => navigate('/login', { replace: true });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {/* Chargement */}
          {callbackState.status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('oauth.connecting')}</h2>
              <p className="text-gray-600">{callbackState.message}</p>
            </>
          )}

          {/* Succès */}
          {callbackState.status === 'success' && (
            <>
              <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t('oauth.success_title')}
              </h2>
              <p className="text-gray-600 mb-4">{callbackState.message}</p>
              <p className="text-sm text-gray-500">{t('oauth.success_redirect')}</p>
            </>
          )}

          {/* Erreur */}
          {callbackState.status === 'error' && (
            <>
              <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('oauth.error_title')}</h2>
              <p className="text-red-600 mb-6">{callbackState.error}</p>
              <div className="space-y-2">
                <button
                  onClick={handleRetry}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('oauth.retry')}
                </button>
                <button
                  onClick={() => navigate('/login', { replace: true })}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('oauth.back_home')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;
