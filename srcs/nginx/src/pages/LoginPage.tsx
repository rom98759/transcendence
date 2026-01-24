// import { useActionState } from 'react';
import { LoginForm } from '../components/organisms/LoginForm';
import { Page } from '../components/organisms/PageContainer';

// interface LoginPageProps {}

// const login = async () => {};

export const LoginPage = () => {
  // const [currentUser, formAction, isPending] = useActionState(login, {});

  return (
    <Page className="flex flex-col" title="Login">
      <LoginForm></LoginForm>
    </Page>
  );
};
