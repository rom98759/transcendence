import { useTranslation } from 'react-i18next';
import Button from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Link } from 'react-router-dom';

export const LoginForm = () => {
  const { t } = useTranslation();

  return (
    <form>
      <Input customType="username" placeholder={t('fieldtype.username-email')}></Input>
      <Input customType="password" placeholder={t('fieldtype.password')}></Input>
      <Button className="mt-4" type="submit">
        {t('auth.login')}
      </Button>
      <div className="text-s text-gray-500 mt-5">
        {t('auth.noAccount')}{' '}
        <span>
          <Link to={`/signup`}>{t('auth.register')}</Link>
        </span>
      </div>
    </form>
  );
};
