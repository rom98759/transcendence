import { useTranslation } from 'react-i18next';
import WelcomeButton from '../../atoms/welcome/WelcomeButton';
import { WelcomeInput } from '../../atoms/welcome/WelcomeInput';
import { useActionState, useEffect } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { emailSchema, ERROR_CODES, FrontendError, HTTP_STATUS } from '@transcendence/core';
import { authApi } from '../../../api/auth-api';
import i18next from 'i18next';
import {
  WelcomeGoogleOAuthButton,
  WelcomeSchool42OAuthButton,
} from '../../atoms/welcome/WelcomeOAuthButton';
import { useLocation } from 'react-router-dom';

interface LoginState {
  fields?: {
    identifier: string;
    username: string;
  };
  errors?: {
    identifier?: string;
    password?: string;
    form?: string;
  };
  success?: boolean;
  require2FA?: boolean;
  twoFactorContext?: {
    username: string;
    expiresIn: number;
  };
}

async function loginAction(prevState: LoginState | null, formData: FormData) {
  const data = Object.fromEntries(formData);
  const { identifier, password } = data as Record<string, string>;
  let username = '';

  const errors: Record<string, string> = {};

  if (identifier.length === 0)
    errors.identifier = i18next.t(`errors.${ERROR_CODES.VALIDATION_MANDATORY}`);
  if (password.length === 0)
    errors.password = i18next.t(`errors.${ERROR_CODES.VALIDATION_MANDATORY}`);
  if (Object.keys(errors).length > 0) {
    return {
      fields: { identifier, username },
      errors,
      success: false,
    };
  }

  const isEmail = emailSchema.safeParse(identifier).success;
  try {
    const result = await authApi.login(
      isEmail ? { email: identifier, password } : { username: identifier, password },
    );

    // Cas 1 : 2FA requis
    if (result.type === 'require2fa') {
      return {
        success: false,
        require2FA: true,
        twoFactorContext: {
          username: result.context.username,
          expiresIn: result.context.expiresIn,
        },
        fields: { identifier, username: result.context.username },
      };
    }

    // Cas 2 : Login normal sans 2FA
    username = result.username;
    return { success: true, fields: { identifier, username } };
  } catch (err: unknown) {
    const nextState: LoginState = {
      fields: { identifier, username },
      errors: {},
      success: false,
    };
    if (err instanceof FrontendError) {
      if (err.statusCode === HTTP_STATUS.BAD_REQUEST && err.details) {
        // Erreurs de validation
        err.details.forEach((d) => {
          const validFields = ['identifier', 'password'];

          if (d.field && validFields.includes(d.field)) {
            const key = d.field as keyof NonNullable<LoginState['errors']>;
            nextState.errors![key] =
              d.message ||
              i18next.t(`zod_errors.${d.reason}`) ||
              i18next.t(`zod_errors.invalid_format`);
          } else {
            nextState.errors!.form =
              d.message ||
              i18next.t(`zod_errors.${d.reason}`) ||
              err.message ||
              i18next.t(`zod_errors.invalid_format`);
          }
        });
      } else {
        // Autres erreurs (unauthorized, etc.)
        nextState.errors!.form =
          i18next.t(`errors.${err.code}`) ||
          err.message ||
          i18next.t(`errors.${ERROR_CODES.INTERNAL_ERROR}`);
      }
    } else {
      (nextState.errors as Record<string, string>)['form'] = i18next.t(
        `errors.${ERROR_CODES.INTERNAL_ERROR}`,
      );
    }
    return nextState;
  }
}

/**
 * WelcomeLoginForm - Formulaire de connexion pour WelcomePage
 * Style: Atome avec gradient cyan/bleu
 */
export const WelcomeLoginForm = ({ onToggleForm }: { onToggleForm?: () => void }) => {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const { login, setPending2FA } = useAuth();
  const location = useLocation();

  // Effet pour login normal (sans 2FA)
  useEffect(() => {
    if (state?.success && state.fields?.username && !('require2FA' in state && state.require2FA)) {
      login({ username: state.fields.username, avatarUrl: null });
    }
  }, [state, login]);

  // Effet pour déclencher le flux 2FA
  useEffect(() => {
    if (state && 'require2FA' in state && state.require2FA && state.twoFactorContext) {
      const from = (location.state as { from?: { pathname: string; search?: string } } | null)
        ?.from;
      setPending2FA({
        username: state.twoFactorContext.username,
        provider: 'local',
        expiresAt: Date.now() + state.twoFactorContext.expiresIn * 1000,
        from: from ?? null,
      });
    }
  }, [state, setPending2FA, location.state]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {/* OAuth Buttons Section */}
      <div className="flex flex-col gap-2">
        <WelcomeGoogleOAuthButton disabled={isPending} />
        <WelcomeSchool42OAuthButton disabled={isPending} />
      </div>

      {/* Separator */}
      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t-2 border-gray-300"></div>
        <span className="flex-shrink mx-2 text-gray-600 text-xs font-bold tracking-widest bg-gradient-to-r from-gray-100 to-gray-50 px-2 py-1 rounded-full border-2 border-gray-200 shadow-sm">
          {t('oauth.or_separator')}
        </span>
        <div className="flex-grow border-t-2 border-gray-300"></div>
      </div>

      {/* Traditional Login Form */}
      <WelcomeInput
        name="identifier"
        customType="username"
        defaultValue={state?.fields?.identifier}
        errorMessage={state?.errors?.identifier}
        autoComplete="username"
        placeholder={t('fieldtype.username-email')}
      />
      <WelcomeInput
        name="password"
        customType="password"
        errorMessage={state?.errors?.password}
        autoComplete="current-password"
        placeholder={t('fieldtype.password')}
      />
      <WelcomeButton className="mt-1" type="submit">
        {isPending ? t('form.processing') : t('auth.login')}
      </WelcomeButton>

      {state?.errors?.form && (
        <div className="bg-red-50 border-2 border-red-300 text-red-700 px-2 py-1.5 rounded-lg text-xs font-medium shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          {state.errors.form}
        </div>
      )}

      <div className="text-xs text-gray-600 mt-2 font-medium">
        {t('auth.noAccount')}{' '}
        <button
          type="button"
          onClick={onToggleForm}
          className="text-[#0088ff] hover:text-[#00ff9f] underline decoration-2 underline-offset-2 transition-colors font-semibold"
        >
          {t('auth.signup')}
        </button>
      </div>
    </form>
  );
};
