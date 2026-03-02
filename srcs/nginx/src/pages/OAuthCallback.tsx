/**
 * OAuthCallback - Page de traitement du callback OAuth
 *
 * Cette page gère le retour depuis les providers OAuth (Google, 42 School).
 *
 * Architecture 100% cohérente avec LoginForm/RegisterForm :
 * - Logique métier extraite dans oauthActions.ts
 * - Placée dans PublicRoute → redirection automatique après login()
 * - Composant purement UI (présentation d'état)
 *
 * Pattern identique à LoginForm :
 * - Actions externalisées (oauthCallbackAction vs loginAction)
 * - useEffect surveille success → appelle login()
 * - PublicRoute gère la navigation automatiquement
 * - Aucune logique métier dans le composant
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Background from '../components/atoms/Background';
import { NavBar } from '../components/molecules/NavBar';
import { oauthCallbackAction, OAuthCallbackState } from '../api/oauthActions';
import { useAuth } from '../providers/AuthProvider';

const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

type OAuthProvider = 'google' | 'school42';

export const OAuthCallback = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { provider } = useParams<{ provider: OAuthProvider }>();
  const [searchParams] = useSearchParams();
  const { login, setPending2FA } = useAuth();

  // State local
  const [state, setState] = useState<OAuthCallbackState>({
    status: 'loading',
  });

  // Traitement du callback OAuth au mount
  useEffect(() => {
    const handleCallback = async () => {
      // Récupération des paramètres OAuth
      const code = searchParams.get('code');
      const oauthState = searchParams.get('state');
      const error = searchParams.get('error');

      // Gestion des erreurs OAuth (utilisateur a refusé l'autorisation)
      if (error) {
        setState({
          status: 'error',
          error: t('oauth.authorization_denied'),
        });
        return;
      }

      // Appel de l'action
      const result = await oauthCallbackAction(provider || '', code, oauthState);
      setState(result);
    };

    handleCallback();
  }, [provider, searchParams, t]);

  // Effet pour login normal (sans 2FA)
  useEffect(() => {
    if (state.status === 'success' && state.data?.username) {
      login({
        username: state.data.username,
        avatarUrl: null,
      });
    }
  }, [state.status, state.data?.username, login]);

  // Effet pour déclencher le flux 2FA
  useEffect(() => {
    if (state.status === 'require2fa' && state.twoFactorContext) {
      setPending2FA({
        username: state.twoFactorContext.username,
        provider: state.twoFactorContext.provider,
        expiresAt: Date.now() + state.twoFactorContext.expiresIn * 1000,
        from: null,
      });
    }
  }, [state.status, state.twoFactorContext, setPending2FA]);

  return (
    <div className="w-full h-full relative">
      <Background
        grainIntensity={4}
        baseFrequency={0.28}
        colorStart={colors.start}
        colorEnd={colors.end}
      >
        <NavBar />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          {state.status === 'loading' && (
            <div className="flex flex-col items-center gap-6 p-8 bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,255,159,0.15),0_0_100px_rgba(0,136,255,0.1)] border border-white/40 animate-in fade-in zoom-in duration-500">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-500 border-t-transparent shadow-lg shadow-cyan-500/50"></div>
                <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-cyan-400 opacity-20"></div>
                <div className="absolute inset-2 animate-pulse rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-xl"></div>
              </div>
              <p className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent animate-pulse">
                {t('oauth.processing')}
              </p>
            </div>
          )}

          {state.status === 'success' && (
            <div className="flex flex-col items-center gap-6 p-8 bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,255,159,0.15),0_0_100px_rgba(0,136,255,0.1)] border border-white/40 animate-in fade-in zoom-in duration-500">
              <div className="relative">
                <div className="text-green-400 text-7xl animate-in zoom-in duration-700 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                  ✓
                </div>
                <div className="absolute inset-0 animate-ping text-green-400 text-7xl opacity-30">
                  ✓
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                  {t('oauth.success')}
                </p>
                <p className="text-sm text-gray-600 animate-pulse flex items-center justify-center gap-2">
                  <span className="inline-block w-1 h-1 bg-cyan-400 rounded-full animate-bounce"></span>
                  <span
                    className="inline-block w-1 h-1 bg-cyan-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></span>
                  <span
                    className="inline-block w-1 h-1 bg-cyan-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  ></span>
                  {t('oauth.redirecting')}
                </p>
              </div>
            </div>
          )}

          {state.status === 'error' && (
            <div className="flex flex-col items-center gap-6 max-w-md p-8 bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,255,159,0.15),0_0_100px_rgba(0,136,255,0.1)] border-2 border-red-400/50 animate-in fade-in zoom-in duration-500">
              <div className="relative">
                <div className="text-red-500 text-7xl animate-in zoom-in duration-700 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                  ✕
                </div>
                <div className="absolute inset-0 animate-pulse text-red-400 text-7xl opacity-20">
                  ✕
                </div>
              </div>
              <div className="space-y-3 text-center">
                <p className="text-2xl font-bold bg-gradient-to-r from-red-500 to-rose-500 bg-clip-text text-transparent">
                  {t('oauth.error')}
                </p>
                <p className="text-sm text-gray-700 leading-relaxed px-4">{state.error}</p>
              </div>
              <button
                onClick={() => navigate('/welcome', { replace: true })}
                className="mt-2 px-8 py-3 bg-gradient-to-r from-[#00ff9f] to-[#0088ff] hover:shadow-[0_4px_20px_rgba(0,255,159,0.3)] text-white rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-[#00ff9f] focus:ring-offset-2"
              >
                {t('oauth.back_to_login')}
              </button>
            </div>
          )}
        </div>
      </Background>
    </div>
  );
};
