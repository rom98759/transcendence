import { useTranslation } from 'react-i18next';
import Button from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Link, useNavigate } from 'react-router-dom';
import { useActionState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { emailSchema, usernameSchema } from '@transcendence/core';
import { authApi } from '../../api/auth-api';

interface LoginState {
  fields?: {
    identifier: string;
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

  const errors: Record<string, string> = {};

  const isEmail = emailSchema.safeParse(identifier).success;
  const emailVal = emailSchema.safeParse(identifier);
  const userVal = usernameSchema.safeParse(identifier);

  if (!emailVal.success && !userVal.success) errors.identifier = 'Invalid identifier format';

  if (Object.keys(errors).length > 0) {
    return {
      fields: { identifier },
      errors,
    };
  }

  try {
    const response = await authApi.login(
      isEmail ? { email: identifier, password } : { username: identifier, password },
    );
    return { success: true, username: response };
  } catch (err: unknown) {
    console.error('Login error:', err);
    return {
      fields: { identifier },
      errors: { form: err instanceof Error ? err.message : 'Server error' },
    };
  }
}

export const LoginForm = () => {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const navigate = useNavigate();
  const { login } = useAuth();
  useEffect(() => {
    if (state?.success && state?.username) {
      const username = state.username;
      login({ username: username, avatarUrl: null });

      navigate(`/profile/${username}`);
    }
  }, [state?.success, state?.username, navigate]);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        name="identifier"
        customType="username"
        defaultValue={state?.fields?.identifier}
        errorMessage={state?.errors?.identifier}
        placeholder={t('fieldtype.username-email')}
      ></Input>
      <Input
        name="password"
        customType="password"
        errorMessage={state?.errors?.password}
        placeholder={t('fieldtype.password')}
      ></Input>
      <Button className="mt-4" type="submit">
        {isPending ? t('auth.processing') : t('auth.login')}
      </Button>

      {state?.errors?.form && <p className="text-red-500 text-sm mb-3">{state.errors.form}</p>}

      <div className="text-xs text-gray-500 mt-5">
        {t('auth.noAccount')}{' '}
        <span>
          <Link className="hover:text-blue-400" to={`/signup`}>
            {t('auth.signup')}
          </Link>
        </span>
      </div>
    </form>
  );
};
