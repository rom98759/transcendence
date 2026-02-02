import { useTranslation } from 'react-i18next';
import Button from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Link, useNavigate } from 'react-router-dom';
import { useActionState, useEffect } from 'react';
import { authApi } from '../../api/auth-api';
import {
  passwordSchema,
  emailSchema,
  usernameSchema,
  FrontendError,
  HTTP_STATUS,
  ERROR_CODES,
} from '@transcendence/core';
import { useAuth } from '../../providers/AuthProvider';
import i18next from 'i18next';

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

  // const { t } = useTranslation();

  const errors: Record<string, string> = {};

  const emailVal = emailSchema.safeParse(email);
  const userVal = usernameSchema.safeParse(username);
  const passVal = passwordSchema.safeParse(password);

  if (!emailVal.success) errors.email = i18next.t(`errors.${ERROR_CODES.VALIDATION_ERROR}`);
  if (!userVal.success) errors.username = i18next.t(`errors.${ERROR_CODES.VALIDATION_ERROR}`);
  if (!passVal.success) errors.password = i18next.t(`errors.${ERROR_CODES.VALIDATION_ERROR}`);

  if (Object.keys(errors).length > 0) {
    return {
      fields: { email, username },
      errors,
      success: false,
    };
  }

  try {
    await authApi.register({ username: username, password: password, email: email });
    await authApi.login({ username: username, password: password });
    return { success: true, fields: { username, email } };
  } catch (err: unknown) {
    const nextState: SignupState = {
      fields: { email, username },
      errors: {},
      success: false,
    };
    if (err instanceof FrontendError) {
      if (err.statusCode === HTTP_STATUS.BAD_REQUEST && err.details) {
        err.details.forEach((d) => {
          if (d.field && d.field in nextState.errors!) {
            const key = d.field as keyof NonNullable<SignupState['errors']>;
            nextState.errors![key] = d.reason;
          } else if (d.field) {
            // If field is not part of state, error will be in form
            nextState.errors!.form = d.reason;
          }
        });
      }

      if (err.statusCode === HTTP_STATUS.CONFLICT && err.details) {
        err.details.forEach((d) => {
          if (d.field && d.field in nextState.fields!) {
            const key = d.field as keyof NonNullable<SignupState['fields']>;
            nextState.errors![key] = err.message;
          } else if (d.field) {
            nextState.errors!.form = err.message;
          }
        });
      } else {
        (nextState.errors as Record<string, string>)['form'] = err.message;
      }
    } else {
      (nextState.errors as Record<string, string>)['form'] = i18next.t(
        `errors.${ERROR_CODES.INTERNAL_ERROR}`,
      );
    }
    return nextState;
  }
}

export const RegisterForm = () => {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState(signupAction, null);
  const navigate = useNavigate();
  const { user, login, isLoggedIn } = useAuth();

  useEffect(() => {
    if (user && isLoggedIn) {
      navigate(`/profile/${user.username}`);
    }
  }, [user, isLoggedIn]);

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
        autoComplete="username"
        defaultValue={state?.fields?.username}
        errorMessage={state?.errors?.username}
        placeholder={t('fieldtype.username-choose')}
      ></Input>
      <Input
        name="email"
        customType="email"
        autoComplete="email"
        defaultValue={state?.fields?.email}
        errorMessage={state?.errors?.email}
        placeholder={t('fieldtype.email')}
      ></Input>
      <Input
        name="password"
        customType="password"
        autoComplete="new-password"
        errorMessage={state?.errors?.password}
        placeholder={t('fieldtype.password-choose')}
      ></Input>

      <Button className="mt-4" type="submit">
        {isPending ? t('form.processing') : t('auth.signup')}
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
