/**
 * OAuthButton - Bouton d'authentification OAuth 2.0
 *
 * Composant React pour l'authentification Google et 42 School.
 * Architecture client-side : génère l'URL OAuth et redirige vers le provider.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type OAuthProvider = 'google' | 'school42';

interface OAuthButtonProps {
  provider: OAuthProvider;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

interface ProviderConfig {
  authUrl: string;
  clientId: string | undefined;
  scopes: string[];
  extraParams: Record<string, string>;
}

/**
 * Configuration OAuth par provider (uniquement les client IDs publics)
 * Les secrets ne sont JAMAIS exposés côté client.
 */
const OAUTH_CONFIG: Record<OAuthProvider, ProviderConfig> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
    extraParams: { access_type: 'offline', prompt: 'consent' },
  },
  school42: {
    authUrl: 'https://api.intra.42.fr/oauth/authorize',
    clientId: import.meta.env.VITE_SCHOOL42_CLIENT_ID,
    scopes: ['public'],
    extraParams: {},
  },
};

/**
 * Génère l'URL de redirection OAuth avec protection CSRF via state aléatoire
 */
function buildOAuthUrl(provider: OAuthProvider): string {
  const config = OAUTH_CONFIG[provider];
  const redirectUri = `${window.location.origin}/auth/oauth/${provider}/callback`;

  const params = new URLSearchParams({
    client_id: config.clientId!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    ...config.extraParams,
  });

  // Protection CSRF : state aléatoire stocké en session
  const csrfState = crypto.randomUUID();
  params.set('state', csrfState);
  sessionStorage.setItem(`oauth_state_${provider}`, csrfState);

  return `${config.authUrl}?${params.toString()}`;
}

/**
 * Composant bouton OAuth générique
 */
export const OAuthButton = ({
  provider,
  children,
  className = '',
  disabled = false,
}: OAuthButtonProps) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const handleOAuthLogin = () => {
    if (disabled || isLoading) return;
    setConfigError(null);

    const clientId = OAUTH_CONFIG[provider].clientId;
    if (!clientId) {
      setConfigError(t('oauth.error_config', { provider }));
      return;
    }

    setIsLoading(true);
    // La redirection quitte la page — pas besoin de setIsLoading(false)
    window.location.href = buildOAuthUrl(provider);
  };

  const baseClasses = `
    w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200
    flex items-center justify-center space-x-2
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-offset-2
  `;

  const providerClasses: Record<OAuthProvider, string> = {
    google: `bg-white border border-gray-300 text-gray-700
      hover:bg-gray-50 focus:ring-blue-500 disabled:hover:bg-white`,
    school42: `bg-black text-white
      hover:bg-gray-800 focus:ring-gray-500 disabled:hover:bg-black`,
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleOAuthLogin}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${providerClasses[provider]} ${className}`}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            <span>{t('oauth.connecting')}</span>
          </>
        ) : (
          children
        )}
      </button>
      {configError && (
        <p className="text-red-500 text-xs mt-1 text-center">{configError}</p>
      )}
    </div>
  );
};

/**
 * Bouton Google pré-configuré avec icône officielle
 */
export const GoogleOAuthButton = ({
  className = '',
  disabled = false,
}: Omit<OAuthButtonProps, 'provider' | 'children'>) => {
  const { t } = useTranslation();
  return (
    <OAuthButton provider="google" className={className} disabled={disabled}>
      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      <span>{t('oauth.continue_google')}</span>
    </OAuthButton>
  );
};

/**
 * Bouton 42 School pré-configuré
 */
export const School42OAuthButton = ({
  className = '',
  disabled = false,
}: Omit<OAuthButtonProps, 'provider' | 'children'>) => {
  const { t } = useTranslation();
  return (
    <OAuthButton provider="school42" className={className} disabled={disabled}>
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M24 12.282L18.069 6l-5.931 6.282L18.069 18zM5.931 6L0 12.282 5.931 18l5.931-6.282z" />
      </svg>
      <span>{t('oauth.continue_42')}</span>
    </OAuthButton>
  );
};
