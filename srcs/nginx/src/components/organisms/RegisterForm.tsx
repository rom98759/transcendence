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
import { ZodSafeParseResult } from 'zod';
import { GoogleOAuthButton, School42OAuthButton } from '../OAuthButton';

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

const adjustErrorMessage = (
  errors: Record<string, string>,
  result: ZodSafeParseResult<string>,
  field: string,
): void => {
  if (!result.success) {
    if (result?.error?.issues) {
      const issue = result.error.issues[0];
      errors[field] = i18next.t(`zod_errors.${issue.code}`);
    } else {
      errors[field] = i18next.t(`errors.${ERROR_CODES.VALIDATION_ERROR}`);
    }
  }
};

async function signupAction(prevState: SignupState | null, formData: FormData) {
  const data = Object.fromEntries(formData);
  const { email, username, password } = data as Record<string, string>;

  const errors: Record<string, string> = {};

  const emailVal = emailSchema.safeParse(email);
  const userVal = usernameSchema.safeParse(username);
  const passVal = passwordSchema.safeParse(password);

  adjustErrorMessage(errors, emailVal, 'email');
  adjustErrorMessage(errors, userVal, 'username');
  adjustErrorMessage(errors, passVal, 'password');

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
          if (d.field && d.field in nextState.errors! && d.reason) {
            const key = d.field as keyof NonNullable<SignupState['errors']>;
            nextState.errors![key] =
              i18next.t(`zod_errors.${d.reason}`) || i18next.t(`zod_errors.invalid_format`);
          } else if (d.field) {
            // If field is not part of state, error will be in form
            nextState.errors!.form =
              i18next.t(`zod_errors.${d.reason}`) || i18next.t(`zod_errors.invalid_format`);
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
    <div className="flex flex-col gap-6">
      {/* Section OAuth */}
      <div className="flex flex-col gap-3">
        <GoogleOAuthButton disabled={isPending} />
        <School42OAuthButton disabled={isPending} />
      </div>

      {/* Séparateur OU */}
      <div className="relative flex items-center">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="bg-white px-3 text-gray-500 text-sm">OU</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      {/* Formulaire classique */}
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
    </div>
  );
};
