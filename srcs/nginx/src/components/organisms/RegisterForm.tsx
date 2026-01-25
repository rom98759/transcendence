import { useTranslation } from 'react-i18next';
import Button from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Link, useNavigate } from 'react-router-dom';
import { useActionState, useEffect } from 'react';
import { authApi } from '../../api/auth-api';
import { passwordSchema, emailSchema, usernameSchema } from '@transcendence/core';
import { useAuth } from '../../providers/AuthProvider';

interface SignupState {
  fields?: {
    email?: string;
    username?: string;
  };
  errors?: {
    email?: string;
    username?: string;
    password?: string;
    form?: string;
  };
  success?: boolean;
}

async function signupAction(prevState: SignupState | null, formData: FormData) {
  const data = Object.fromEntries(formData);
  const { email, username, password } = data as Record<string, string>;

  const errors: Record<string, string> = {};

  const emailVal = emailSchema.safeParse(email);
  const userVal = usernameSchema.safeParse(username);
  const passVal = passwordSchema.safeParse(password);

  if (!emailVal.success) errors.email = 'Invalid email format';
  if (!userVal.success) errors.username = 'Username should be at least 4 chars';
  if (!passVal.success) errors.password = 'Password is too weak';

  if (Object.keys(errors).length > 0) {
    return {
      fields: { email, username },
      errors,
    };
  }

  try {
    await authApi.register({ username: username, password: password, email: email });
    await authApi.login({ username: username, password: password });
    return { success: true, fields: { username, email } };
  } catch (err: unknown) {
    console.error('Signup or Login error:', err);
    return {
      fields: { email, username },
      errors: { form: err instanceof Error ? err.message : 'Server error' },
    };
  }
}

export const RegisterForm = () => {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState(signupAction, null);
  const navigate = useNavigate();
  const { login } = useAuth();
  useEffect(() => {
    if (state?.success && state.fields?.username) {
      const username = state.fields?.username;
      login({ username: username, avatarUrl: null });
      navigate(`/profile/${username}`);
    }
  }, [state?.success, state?.fields?.username, navigate]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        name="username"
        customType="username"
        defaultValue={state?.fields?.username}
        errorMessage={state?.errors?.username}
        placeholder={t('fieldtype.username-choose')}
      ></Input>
      <Input
        name="email"
        customType="email"
        defaultValue={state?.fields?.email}
        errorMessage={state?.errors?.email}
        placeholder={t('fieldtype.email')}
      ></Input>
      <Input
        name="password"
        customType="password"
        errorMessage={state?.errors?.password}
        placeholder={t('fieldtype.password-choose')}
      ></Input>

      <Button className="mt-4" type="submit">
        {isPending ? t('auth.processing') : t('auth.signup')}
      </Button>

      {state?.errors?.form && <p className="text-red-500 text-sm mb-3">{state.errors.form}</p>}

      <div className="text-xs text-gray-500 mt-5">
        {t('auth.hasAccount')}{' '}
        <span>
          <Link className="hover:text-blue-400" to={`/login`}>
            {t('auth.login')}
          </Link>
        </span>
      </div>
    </form>
  );
};
