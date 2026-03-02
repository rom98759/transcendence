import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import logo42 from '../../../assets/icons/42.svg';
import logoGoogle from '../../../assets/icons/google.svg';
import { buildOAuthUrl, OAUTH_CONFIG } from '../../../api/oauthActions';

type OAuthProvider = 'google' | 'school42';

interface WelcomeOAuthButtonProps {
  provider: OAuthProvider;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * WelcomeOAuthButton - Bouton OAuth avec style cyan/bleu pour WelcomePage
 */
export const WelcomeOAuthButton = ({
  provider,
  children,
  className = '',
  disabled = false,
}: WelcomeOAuthButtonProps) => {
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
    window.location.href = buildOAuthUrl(provider);
  };

  const baseClasses = `
    w-full py-2 px-6 rounded-xl font-semibold text-sm
    transition-all duration-300 ease-out
    flex items-center justify-center space-x-3
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white
    transform hover:scale-[1.02] active:scale-[0.98]
    shadow-lg hover:shadow-xl
  `;

  const providerClasses: Record<OAuthProvider, string> = {
    google: `bg-white border-2 border-gray-300 text-gray-800
      hover:border-[#0088ff] hover:shadow-[0_4px_20px_rgba(0,136,255,0.2)]
      focus:ring-[#0088ff] disabled:hover:border-gray-300
      `,
    school42: `bg-gradient-to-r from-slate-800 to-slate-900 border-2 border-slate-600 text-white
      hover:from-slate-700 hover:to-slate-800 hover:border-[#00ff9f] hover:shadow-[0_4px_20px_rgba(0,255,159,0.2)]
      focus:ring-[#00ff9f] disabled:hover:from-slate-800 disabled:hover:to-slate-900
      `,
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleOAuthLogin}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${providerClasses[provider]} ${className} group`}
      >
        {isLoading ? (
          <>
            <div className="relative">
              <div className="animate-spin rounded-full h-5 w-5 border-3 border-current border-t-transparent" />
              <div className="absolute inset-0 animate-ping rounded-full h-5 w-5 border-2 border-current opacity-20" />
            </div>
            <span className="animate-pulse">{t('oauth.connecting')}</span>
          </>
        ) : (
          children
        )}
      </button>
      {configError && (
        <p className="text-red-700 text-xs mt-2 text-center bg-red-50 py-2 px-3 rounded-lg border-2 border-red-200 font-semibold animate-in fade-in slide-in-from-top-1 duration-300">
          {configError}
        </p>
      )}
    </div>
  );
};

/**
 * WelcomeGoogleOAuthButton - Bouton Google pré-configuré
 */
export const WelcomeGoogleOAuthButton = ({
  className = '',
  disabled = false,
}: Omit<WelcomeOAuthButtonProps, 'provider' | 'children'>) => {
  const { t } = useTranslation();
  return (
    <WelcomeOAuthButton provider="google" className={className} disabled={disabled}>
      <img
        src={logoGoogle}
        alt="Google"
        className="w-6 h-6 transition-transform duration-300 group-hover:scale-110"
      />
      <span className="tracking-wide">{t('oauth.continue_google')}</span>
    </WelcomeOAuthButton>
  );
};

/**
 * WelcomeSchool42OAuthButton - Bouton 42 School pré-configuré
 */
export const WelcomeSchool42OAuthButton = ({
  className = '',
  disabled = false,
}: Omit<WelcomeOAuthButtonProps, 'provider' | 'children'>) => {
  const { t } = useTranslation();
  return (
    <WelcomeOAuthButton provider="school42" className={className} disabled={disabled}>
      <img
        src={logo42}
        alt="42 School"
        className="w-6 h-6 brightness-0 invert transition-transform duration-300 group-hover:scale-110"
      />
      <span className="tracking-wide">{t('oauth.continue_42')}</span>
    </WelcomeOAuthButton>
  );
};
