import { useTranslation } from 'react-i18next';
import Button from '../atoms/Button';
import { Input } from '../atoms/Input';
import { useNavigate } from 'react-router-dom';
import { useActionState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { emailSchema, ERROR_CODES, FrontendError, HTTP_STATUS } from '@transcendence/core';
import { authApi } from '../../api/auth-api';
import i18next from 'i18next';

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
    username = await authApi.login(
      isEmail ? { email: identifier, password } : { username: identifier, password },
    );
    return { success: true, fields: { identifier, username } };
  } catch (err: unknown) {
    const nextState: LoginState = {
      fields: { identifier, username },
      errors: {},
      success: false,
    };
    if (err instanceof FrontendError) {
      if (err.statusCode === HTTP_STATUS.BAD_REQUEST) {
        if (err.details) {
          err.details.forEach((d) => {
            if (d.field && d.field in nextState.errors!) {
              const key = d.field as keyof NonNullable<LoginState['errors']>;
              nextState.errors![key] =
                i18next.t(`zod_errors.${d.reason}`) || i18next.t(`zod_errors.invalid_format`);
            } else if (d.field) {
              nextState.errors!.form =
                i18next.t(`zod_errors.${d.reason}`) || i18next.t(`zod_errors.invalid_format`);
            }
          });
        }
      } else if (err.code) {
        nextState.errors!.form =
          i18next.t(`errors.${err.code}`) || i18next.t(`errors.${ERROR_CODES.INTERNAL_ERROR}`);
      }
    } else {
      (nextState.errors as Record<string, string>)['form'] = i18next.t(
        `errors.${ERROR_CODES.INTERNAL_ERROR}`,
      );
    }
    return nextState;
  }
}

export const LoginForm = ({ onToggleForm }: { onToggleForm?: () => void }) => {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const navigate = useNavigate();
  const { user, login } = useAuth();
  useEffect(() => {
    if (state?.success && state.fields?.username) {
      const username = state.fields.username;
      login({ username: username, avatarUrl: null });
      // navigate(`/profile/${username}`, { replace: true });
      navigate(`/`, { replace: true });
    }
    if (user?.username) {
      // navigate(`/profile/${username}`, { replace: true });
      navigate(`/`, { replace: true });
    }
  }, [state?.success, state?.fields?.username, user, navigate, login]);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        name="identifier"
        customType="username"
        defaultValue={state?.fields?.identifier}
        errorMessage={state?.errors?.identifier}
        autoComplete="username"
        placeholder={t('fieldtype.username-email')}
      ></Input>
      <Input
        name="password"
        customType="password"
        errorMessage={state?.errors?.password}
        autoComplete="current-password"
        placeholder={t('fieldtype.password')}
      ></Input>
      <Button className="mt-4" type="submit">
        {isPending ? t('form.processing') : t('auth.login')}
      </Button>

      {state?.errors?.form && <p className="text-red-500 text-sm mb-3">{state.errors.form}</p>}

      <div className="text-xs text-gray-500 mt-5">
        {t('auth.noAccount')}{' '}
        <button type="button" onClick={onToggleForm} className="hover:text-blue-400 underline">
          {t('auth.signup')}
        </button>
      </div>
    </form>
  );
};
