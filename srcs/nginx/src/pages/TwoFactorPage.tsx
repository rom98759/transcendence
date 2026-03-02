/**
 * TwoFactorPage - Page de validation du code OTP après login/oauth
 *
 * Cette page est affichée lorsque le backend requiert une authentification 2FA.
 * Elle valide le code à 6 chiffres fourni par l'utilisateur.
 *
 * Protection :
 * - Accessible uniquement si un contexte 2FA temporaire existe
 * - Redirige vers /welcome si aucun contexte ou contexte expiré
 *
 * Workflow :
 * 1. Login/OAuth → Backend retourne require2FA: true
 * 2. Frontend stocke contexte temporaire → Navigate /2fa (replace)
 * 3. User entre code OTP → POST /auth/2fa/verify
 * 4. Backend valide → Retourne vrai token
 * 5. Frontend appelle login() → PublicRoute redirige vers /home
 *
 * Pattern identique à WelcomeLoginForm :
 * - Action externalisée
 * - useEffect surveille success → appelle login()
 * - Navigation gérée automatiquement par PublicRoute
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../providers/AuthProvider';
import { authApi } from '../api/auth-api';
import { FrontendError, ERROR_CODES } from '@transcendence/core';
import Background from '../components/atoms/Background';
import { NavBar } from '../components/molecules/NavBar';

const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

interface ErrorKey {
  key: string;
  params?: Record<string, unknown>;
}

interface TwoFactorState {
  code: string;
  error: ErrorKey | null;
  isSubmitting: boolean;
  showApps: boolean;
  showHelp: boolean;
}

const TOTP_APPS = [
  {
    name: 'Google Authenticator',
    icon: '🔐',
    platforms: 'iOS & Android',
    url: 'https://support.google.com/accounts/answer/1066447',
  },
  {
    name: 'Authy',
    icon: '🛡️',
    platforms: 'iOS, Android & Desktop',
    url: 'https://authy.com/download/',
  },
  {
    name: 'Microsoft Authenticator',
    icon: '🪟',
    platforms: 'iOS & Android',
    url: 'https://www.microsoft.com/fr-fr/security/mobile-authenticator-app',
  },
  {
    name: 'Bitwarden Authenticator',
    icon: '🔒',
    platforms: 'iOS & Android',
    url: 'https://bitwarden.com/products/authenticator/',
  },
];

export const TwoFactorPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, clearPending2FA, pending2FA } = useAuth();

  const [state, setState] = useState<TwoFactorState>({
    code: '',
    error: null,
    isSubmitting: false,
    showApps: false,
    showHelp: false,
  });

  // Timer de redirection après erreur fatale — annulé proprement au démontage
  // (fermeture d'onglet, navigation extérieure, etc.)
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation frontend
    if (state.code.length !== 6 || !/^\d{6}$/.test(state.code)) {
      setState((prev) => ({
        ...prev,
        error: { key: `errors.${ERROR_CODES.INVALID_CODE_FORMAT}` },
      }));
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const username = await authApi.verify2FALogin(state.code);

      // Lire la destination avant de clear le contexte
      const from = pending2FA?.from;
      clearPending2FA();
      login({ username, avatarUrl: null });

      // Destination : page originale si disponible, /home sinon
      const destination = from?.pathname ? `${from.pathname}${from.search ?? ''}` : '/home';
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      let errorKey: ErrorKey = { key: `errors.${ERROR_CODES.INTERNAL_ERROR}` };

      if (err instanceof FrontendError) {
        switch (err.code) {
          // Erreurs fatales — session détruite côté serveur
          case ERROR_CODES.LOGIN_SESSION_EXPIRED:
          case ERROR_CODES.TOO_MANY_ATTEMPTS: {
            clearPending2FA();
            errorKey = { key: `errors.${err.code}` };
            setState((prev) => ({ ...prev, error: errorKey, isSubmitting: false, code: '' }));
            // Laisser 2,5s à l'utilisateur pour lire le message
            // Le timer est annulé proprement si le composant se démonte
            redirectTimerRef.current = setTimeout(() => {
              navigate('/welcome', { replace: true });
            }, 2500);
            return;
          }

          // Code incorrect — afficher tentatives restantes
          case ERROR_CODES.INVALID_2FA_CODE: {
            const remaining =
              typeof err.meta?.remainingAttempts === 'number' ? err.meta.remainingAttempts : null;
            errorKey =
              remaining !== null
                ? { key: '2fa.invalid_code_with_attempts', params: { count: remaining } }
                : { key: `errors.${ERROR_CODES.INVALID_2FA_CODE}` };
            break;
          }

          case ERROR_CODES.INVALID_CODE_FORMAT:
          case ERROR_CODES.MISSING_PARAMETERS:
            errorKey = { key: `errors.${ERROR_CODES.INVALID_CODE_FORMAT}` };
            break;

          default:
            errorKey = { key: `errors.${ERROR_CODES.INTERNAL_ERROR}` };
            break;
        }
      }

      setState((prev) => ({ ...prev, error: errorKey, isSubmitting: false, code: '' }));
    }
  };

  const handleCancel = () => {
    clearPending2FA();
    navigate('/welcome', { replace: true });
  };

  return (
    <div className="w-full h-full relative">
      <Background
        grainIntensity={4}
        baseFrequency={0.28}
        colorStart={colors.start}
        colorEnd={colors.end}
      >
        <NavBar />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,255,159,0.15),0_0_100px_rgba(0,136,255,0.1)] border border-white/40 p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/50">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
                {t('2fa.title')}
              </h1>
              <p className="text-sm text-gray-600">
                {t('2fa.subtitle')}
                {pending2FA?.username && (
                  <span className="block mt-1 font-semibold text-cyan-600">
                    {pending2FA.username}
                  </span>
                )}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* OTP Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="otp-code" className="block text-sm font-medium text-gray-700">
                    {t('2fa.code_label')}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setState((prev) => ({ ...prev, showApps: !prev.showApps, showHelp: false }))
                    }
                    className="inline-flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-800 font-medium transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    {t('2fa.apps_button')}
                  </button>
                </div>

                {/* Apps popover */}
                {state.showApps && (
                  <div className="mb-3 bg-cyan-50 border border-cyan-200 rounded-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-xs font-semibold text-cyan-700 mb-2">
                      {t('2fa.apps_title')}
                    </p>
                    <div className="space-y-2">
                      {TOTP_APPS.map((app) => (
                        <a
                          key={app.name}
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg bg-white hover:bg-cyan-100 transition-colors group"
                        >
                          <span className="text-base">{app.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 group-hover:text-cyan-700 transition-colors">
                              {app.name}
                            </p>
                            <p className="text-xs text-gray-500">{app.platforms}</p>
                          </div>
                          <svg
                            className="w-3 h-3 text-gray-400 group-hover:text-cyan-600 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={state.code}
                  onChange={(e) =>
                    setState((prev) => ({ ...prev, code: e.target.value.replace(/\D/g, '') }))
                  }
                  disabled={state.isSubmitting}
                  autoFocus
                  className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest text-gray-900 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="000000"
                />
              </div>

              {/* Error Message */}
              {state.error && (
                <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
                  {t(state.error.key, state.error.params)}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={state.isSubmitting}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                >
                  {t('2fa.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={state.isSubmitting || state.code.length !== 6}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#00ff9f] to-[#0088ff] hover:shadow-[0_4px_20px_rgba(0,255,159,0.3)] text-white rounded-xl transition-all transform hover:scale-105 active:scale-95 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {state.isSubmitting ? t('2fa.verifying') : t('2fa.verify')}
                </button>
              </div>
            </form>

            {/* Info + Help */}
            <div className="mt-6 space-y-3">
              <div className="text-center text-xs text-gray-500">
                <p>{t('2fa.help_text')}</p>
              </div>

              {/* Code oublié */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() =>
                    setState((prev) => ({ ...prev, showHelp: !prev.showHelp, showApps: false }))
                  }
                  className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {t('2fa.forgot_code')}
                </button>

                {state.showHelp && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-left animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-amber-800 mb-2">{t('2fa.forgot_help_text')}</p>
                    <a
                      href="/faq"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 transition-colors"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {t('2fa.faq_link')}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Background>
    </div>
  );
};
