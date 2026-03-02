import { authApi } from './auth-api';
import i18next from 'i18next';

/**
 * Types pour la gestion d'état OAuth
 */
export interface OAuthCallbackState {
  status: 'idle' | 'loading' | 'success' | 'error' | 'require2fa';
  data?: {
    username: string;
    provider: string;
    isNewUser: boolean;
  };
  error?: string;
  twoFactorContext?: {
    username: string;
    expiresIn: number;
    provider: 'google' | 'school42';
  };
}

/**
 * Configuration OAuth par provider
 */
interface ProviderConfig {
  authUrl: string;
  clientId: string | undefined;
  scopes: string[];
  extraParams: Record<string, string>;
}

export const OAUTH_CONFIG: Record<string, ProviderConfig> = {
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
 * Génère l'URL de redirection OAuth avec protection CSRF
 *
 * @param provider - Provider OAuth ('google' | 'school42')
 * @returns URL OAuth complète avec state CSRF
 * @throws Error si le provider n'est pas supporté ou si clientId est manquant
 */
export function buildOAuthUrl(provider: 'google' | 'school42'): string {
  const config = OAUTH_CONFIG[provider];

  if (!config) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  if (!config.clientId) {
    throw new Error(`Missing clientId configuration for provider: ${provider}`);
  }

  const redirectUri = `${window.location.origin}/auth/oauth/${provider}/callback`;

  const params = new URLSearchParams({
    client_id: config.clientId,
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
 * Valide le state CSRF pour protéger contre les attaques
 */
export function validateOAuthState(provider: string, receivedState: string | null): boolean {
  if (!receivedState) {
    return false;
  }

  const storedState = sessionStorage.getItem(`oauth_state_${provider}`);
  sessionStorage.removeItem(`oauth_state_${provider}`);

  return storedState === receivedState;
}

/**
 * Action OAuth callback
 *
 * @param provider - Provider OAuth ('google' | 'school42')
 * @param code - Code d'autorisation OAuth
 * @param state - State CSRF
 * @returns État de l'opération avec données utilisateur ou erreur
 */
export async function oauthCallbackAction(
  provider: string,
  code: string | null,
  state: string | null,
): Promise<OAuthCallbackState> {
  // Validation du provider
  if (!provider || (provider !== 'google' && provider !== 'school42')) {
    return {
      status: 'error',
      error: i18next.t('oauth.invalid_provider'),
    };
  }

  // Gestion des erreurs OAuth (utilisateur a refusé l'autorisation)
  if (!code) {
    return {
      status: 'error',
      error: i18next.t('oauth.missing_code'),
    };
  }

  // Validation CSRF via state
  if (!validateOAuthState(provider, state)) {
    return {
      status: 'error',
      error: i18next.t('oauth.invalid_state'),
    };
  }

  // Échange du code contre un JWT via le backend
  try {
    const response = await authApi.oauthCallback(provider as 'google' | 'school42', {
      code,
      state: state || undefined,
    });

    // Cas 1 : 2FA requis
    if (response.type === 'require2fa') {
      return {
        status: 'require2fa',
        twoFactorContext: {
          username: response.context.username,
          expiresIn: response.context.expiresIn,
          provider: provider as 'google' | 'school42',
        },
      };
    }

    // Cas 2 : Login OAuth normal sans 2FA
    return {
      status: 'success',
      data: {
        username: response.username,
        provider: response.provider,
        isNewUser: response.isNewUser,
      },
    };
  } catch (err: unknown) {
    console.error('OAuth callback error:', err);
    return {
      status: 'error',
      error: err instanceof Error ? err.message : i18next.t('oauth.callback_failed'),
    };
  }
}
