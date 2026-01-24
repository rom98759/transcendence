import { useTranslation } from 'react-i18next';
import Button from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Link } from 'react-router-dom';

export const RegisterForm = () => {
  const { t } = useTranslation();

  return (
    <form>
      <Input customType="username" placeholder={t('fieldtype.username-choose')}></Input>
      <Input customType="email" placeholder={t('fieldtype.email')}></Input>
      <Input customType="password" placeholder={t('fieldtype.password-choose')}></Input>
      <Button className="mt-4" type="submit">
        {t('auth.signup')}
      </Button>
      <div className="text-s text-gray-500 mt-5">
        {t('auth.hasAccount')}{' '}
        <span>
          <Link to={`/login`}>{t('auth.login')}</Link>
        </span>
      </div>
    </form>
  );
};
