/**
 * OAuthCallback - Page de traitement des callbacks OAuth
 *
 * Cette page est appelée après redirection depuis Google/42
 * Elle extrait le code d'autorisation et l'échange contre un JWT
 * Puis redirige l'utilisateur vers le dashboard/profile
 *
 * Flow:
 * 1. Google/42 redirige vers /auth/oauth/google/callback?code=...
 * 2. Cette page extrait le code et l'envoie au service auth
 * 3. Service auth échange le code contre un profil utilisateur
 * 4. Service auth génère un JWT et le retourne
 * 5. Frontend stocke le JWT et redirige vers le dashboard
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { authApi } from '../api/auth-api';

interface OAuthCallbackState {
  status: 'loading' | 'success' | 'error';
  message?: string;
  error?: string;
}

/**
 * Page de callback OAuth
 */
export const OAuthCallback = () => {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { logout, checkAuth } = useAuth();

  const [state, setState] = useState<OAuthCallbackState>({
    status: 'loading',
    message: 'Connexion en cours...',
  });

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Validation du provider
        if (!provider || !['google', 'school42'].includes(provider)) {
          setState({
            status: 'error',
            error: `Provider OAuth invalide: ${provider}`,
          });
          return;
        }

        // Récupérer le code d'autorisation
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state');

        // Vérifier les erreurs de redirection
        if (error) {
          const errorDescription = searchParams.get('error_description') || error;
          setState({
            status: 'error',
            error: `Erreur OAuth: ${errorDescription}`,
          });
          return;
        }

        // Vérifier le code d'autorisation
        if (!code) {
          setState({
            status: 'error',
            error: "Code d'autorisation manquant",
          });
          return;
        }

        console.log(`Processing OAuth callback for ${provider}`, {
          code: code.substring(0, 10) + '...',
          state,
        });

        setState({
          status: 'loading',
          message: `Connexion avec ${provider}...`,
        });

        // Appeler l'API auth pour échanger le code
        const result = await authApi.oauthCallback(provider as 'google' | 'school42', {
          code,
          state: state || undefined,
        });

        console.log('OAuth callback success:', result);

        setState({
          status: 'success',
          message: result.message,
        });

        // Actualiser l'état d'authentification
        await checkAuth();

        // Redirection après succès
        setTimeout(() => {
          if (result.isNewUser) {
            // Nouveau compte: rediriger vers profil pour configuration
            navigate(`/profile/${result.username}`, { replace: true });
          } else {
            // Compte existant: rediriger vers dashboard
            navigate('/dashboard', { replace: true });
          }
        }, 2000);
      } catch (error: any) {
        console.error('OAuth callback error:', error);

        let errorMessage = 'Erreur durant la connexion OAuth';

        if (error?.response?.data?.error) {
          errorMessage = error.response.data.error.message || errorMessage;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        setState({
          status: 'error',
          error: errorMessage,
        });

        // Déconnecter en cas d'erreur (nettoyage)
        logout();
      }
    };

    handleOAuthCallback();
  }, [provider, searchParams, navigate, checkAuth, logout]);

  // Fonction pour réessayer
  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {/* État de chargement */}
          {state.status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connexion OAuth</h2>
              <p className="text-gray-600">{state.message}</p>
            </>
          )}

          {/* État de succès */}
          {state.status === 'success' && (
            <>
              <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connexion réussie !</h2>
              <p className="text-gray-600 mb-4">{state.message}</p>
              <p className="text-sm text-gray-500">Redirection automatique en cours...</p>
            </>
          )}

          {/* État d'erreur */}
          {state.status === 'error' && (
            <>
              <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connexion échouée</h2>
              <p className="text-red-600 mb-6">{state.error}</p>
              <div className="space-y-2">
                <button
                  onClick={handleRetry}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Réessayer
                </button>
                <button
                  onClick={() => navigate('/dashboard', { replace: true })}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Retour à l'accueil
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
