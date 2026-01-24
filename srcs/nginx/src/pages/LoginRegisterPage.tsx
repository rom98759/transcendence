// import { useActionState } from 'react';
import { RegisterForm } from '../components/organisms/RegisterForm';
import { LoginForm } from '../components/organisms/LoginForm';
import { Page } from '../components/organisms/PageContainer';
import { useTranslation } from 'react-i18next';

interface LoginRegisterPageProps {
  isRegister: boolean;
}

// const login = async () => {};

export const LoginPage = ({ isRegister }: LoginRegisterPageProps) => {
  // const [currentUser, formAction, isPending] = useActionState(login, {});
  const { t } = useTranslation();

  const title = isRegister ? t('auth.signup') : t('auth.login');
  return (
    <Page className="flex flex-col" title={title}>
      {isRegister ? <RegisterForm /> : <LoginForm />}
    </Page>
  );
};
