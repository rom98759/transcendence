import { useTranslation } from 'react-i18next';
import WelcomeButton from '../../atoms/welcome/WelcomeButton';
import { WelcomeInput } from '../../atoms/welcome/WelcomeInput';
import { useActionState, useEffect, useState } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import {
  emailSchema,
  ERROR_CODES,
  FrontendError,
  HTTP_STATUS,
  passwordSchema,
  usernameSchema,
} from '@transcendence/core';
import { authApi } from '../../../api/auth-api';
import i18next from 'i18next';
import {
  WelcomeGoogleOAuthButton,
  WelcomeSchool42OAuthButton,
} from '../../atoms/welcome/WelcomeOAuthButton';
import { ValidationChecklist } from '../../atoms/welcome/ValidationChecklist';
import Checkbox from '../../atoms/Checkbox';

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
    acceptTerms?: string;
  };
  success?: boolean;
}

const adjustErrorMessage = (
  errors: Record<string, string>,
  result: ReturnType<typeof emailSchema.safeParse>,
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
  const { email, username, password, acceptTerms } = data as Record<string, string>;

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

  if (!acceptTerms) {
    errors.acceptTerms = i18next.t('errors.must_accept_terms');
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
        // Erreurs de validation (ex: username réservé, format invalide)
        err.details.forEach((d) => {
          const validFields = ['email', 'username', 'password'];

          if (d.field && validFields.includes(d.field)) {
            // Afficher l'erreur sur le champ concerné
            const key = d.field as keyof NonNullable<SignupState['errors']>;
            nextState.errors![key] =
              d.message ||
              i18next.t(`zod_errors.${d.reason}`) ||
              i18next.t(`zod_errors.invalid_format`);
          } else {
            // Erreur générale si le champ n'est pas dans le formulaire
            nextState.errors!.form =
              d.message ||
              i18next.t(`zod_errors.${d.reason}`) ||
              err.message ||
              i18next.t(`zod_errors.invalid_format`);
          }
        });
      } else if (err.statusCode === HTTP_STATUS.CONFLICT && err.details) {
        // Conflits (username/email déjà existant)
        err.details.forEach((d) => {
          const validFields = ['email', 'username'];

          if (d.field && validFields.includes(d.field)) {
            const key = d.field as keyof NonNullable<SignupState['errors']>;
            nextState.errors![key] = d.message || i18next.t(`errors.${ERROR_CODES.CONFLICT}`);
          } else {
            nextState.errors!.form = d.message || err.message;
          }
        });
      } else {
        // Autres erreurs (ni BAD_REQUEST ni CONFLICT)
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

/**
 * WelcomeRegisterForm - Formulaire d'inscription pour WelcomePage
 * Style: Atome avec gradient cyan/bleu
 */
export const WelcomeRegisterForm = ({ onToggleForm }: { onToggleForm?: () => void }) => {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState(signupAction, null);
  const { login } = useAuth();

  // States pour la validation en temps réel
  const [username, setUsername] = useState(state?.fields?.username || '');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (state?.success && state.fields?.username) {
      login({ username: state.fields.username, avatarUrl: null });
    }
  }, [state?.success, state?.fields?.username, login]);

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      {/* OAuth Buttons Section */}
      <div className="flex flex-col gap-1.5">
        <WelcomeGoogleOAuthButton disabled={isPending} />
        <WelcomeSchool42OAuthButton disabled={isPending} />
      </div>

      {/* Separator */}
      <div className="relative flex items-center py-1">
        <div className="grow border-t border-gray-300"></div>
        <span className="shrink mx-2 text-gray-600 text-[10px] font-bold tracking-widest bg-gradient-to-r from-gray-100 to-gray-50 px-1.5 py-0.5 rounded-full border border-gray-200 shadow-sm">
          {t('oauth.or_separator')}
        </span>
        <div className="grow border-t border-gray-300"></div>
      </div>

      {/* Traditional Registration Form */}
      <WelcomeInput
        name="username"
        customType="username"
        autoComplete="username"
        defaultValue={state?.fields?.username}
        errorMessage={state?.errors?.username}
        placeholder={t('fieldtype.username-choose')}
        onChange={(e) => setUsername(e.target.value)}
        showValidation={username.length > 0}
        validationContent={<ValidationChecklist value={username} type="username" />}
      />
      <WelcomeInput
        name="email"
        customType="email"
        autoComplete="email"
        defaultValue={state?.fields?.email}
        errorMessage={state?.errors?.email}
        placeholder={t('fieldtype.email')}
      />
      <WelcomeInput
        name="password"
        customType="password"
        autoComplete="new-password"
        errorMessage={state?.errors?.password}
        placeholder={t('fieldtype.password-choose')}
        onChange={(e) => setPassword(e.target.value)}
        showValidation={password.length > 0}
        validationContent={<ValidationChecklist value={password} type="password" />}
      />

      <Checkbox
        name="acceptTerms"
        accepted={accepted}
        onCheck={setAccepted}
        errorMessage={state?.errors?.acceptTerms}
      />

      <WelcomeButton className="mt-1" type="submit">
        {isPending ? t('form.processing') : t('auth.signup')}
      </WelcomeButton>

      {state?.errors?.form && (
        <div className="bg-red-50 border-2 border-red-300 text-red-700 px-2 py-1.5 rounded-lg text-xs font-medium shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          {state.errors.form}
        </div>
      )}

      <div className="text-[10px] text-gray-600 mt-1 font-medium">
        {t('auth.hasAccount')}{' '}
        <button
          type="button"
          onClick={onToggleForm}
          className="text-[#0088ff] hover:text-[#3040ca] underline decoration-1 underline-offset-2 transition-colors font-semibold"
        >
          {t('auth.login')}
        </button>
      </div>
    </form>
  );
};
