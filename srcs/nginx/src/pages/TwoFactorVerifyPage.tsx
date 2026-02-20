import { useActionState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../providers/AuthProvider';
import { authApi } from '../api/auth-api';
import { FrontendError, ERROR_CODES, HTTP_STATUS } from '@transcendence/core';
import Button from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Page } from '../components/organisms/PageContainer';
import i18next from 'i18next';

interface VerifyState {
  fields?: {
    code: string;
  };
  errors?: {
    code?: string;
    form?: string;
  };
  success: boolean; // Obligatoire pour discriminated union
  username?: string;
}

async function verify2FAAction(
  _prevState: VerifyState | null,
  formData: FormData,
): Promise<VerifyState> {
  const data = Object.fromEntries(formData);
  const { code } = data as Record<string, string>;

  const errors: Record<string, string> = {};

  // Validation du code
  if (!code) {
    errors.code = i18next.t(`errors.${ERROR_CODES.VALIDATION_MANDATORY}`);
  } else if (!/^\d{6}$/.test(code)) {
    errors.code = 'Le code doit contenir 6 chiffres';
  }

  if (Object.keys(errors).length > 0) {
    return {
      fields: { code },
      errors,
      success: false,
    };
  }

  try {
    const result = await authApi.verify2FALogin(code);
    return {
      success: true,
      username: result.username,
      fields: { code: '' },
    };
  } catch (err: unknown) {
    const nextState: VerifyState = {
      fields: { code },
      errors: {},
      success: false,
    };

    if (err instanceof FrontendError) {
      if (err.statusCode === HTTP_STATUS.BAD_REQUEST) {
        nextState.errors!.code = err.message || 'Code invalide';
      } else if (err.statusCode === HTTP_STATUS.UNAUTHORIZED) {
        nextState.errors!.form = 'Session expirée. Veuillez vous reconnecter.';
      } else if (err.statusCode === HTTP_STATUS.TOO_MANY_REQUESTS) {
        nextState.errors!.form = err.message || 'Trop de tentatives. Veuillez réessayer plus tard.';
      } else if (err.code) {
        nextState.errors!.form =
          i18next.t(`errors.${err.code}`) || i18next.t(`errors.${ERROR_CODES.INTERNAL_ERROR}`);
      }
    } else {
      nextState.errors!.form = i18next.t(`errors.${ERROR_CODES.INTERNAL_ERROR}`);
    }
    return nextState;
  }
}

export const TwoFactorVerifyPage = () => {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState(verify2FAAction, null);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    if (state?.success && state.username) {
      login({ username: state.username, avatarUrl: null });
      navigate(`/profile/${state.username}`, { replace: true });
    }
  }, [state?.success, state?.username, navigate, login]);

  return (
    <Page>
      <div className="max-w-md mx-auto bg-white/10 backdrop-blur-md rounded-xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Authentification 2FA</h1>
          <p className="text-gray-300">
            Entrez le code à 6 chiffres depuis votre application d'authentification
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <Input
            name="code"
            defaultValue={state?.fields?.code}
            errorMessage={state?.errors?.code}
            autoComplete="off"
            placeholder="000000"
            maxLength={6}
            className="text-center text-2xl tracking-widest"
          />

          <Button className="mt-4" type="submit" disabled={isPending}>
            {isPending ? 'Vérification...' : 'Vérifier et se connecter'}
          </Button>

          {state?.errors?.form && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
              <p className="text-red-200 text-sm text-center">{state.errors.form}</p>
            </div>
          )}
        </form>

        <div className="text-center text-sm text-gray-400">
          <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">
            ← Retour à la connexion
          </button>
        </div>
      </div>
    </Page>
  );
};
