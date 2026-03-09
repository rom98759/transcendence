import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface FooterProps {
  className?: string;
}

export const Footer = ({ className = '' }: FooterProps) => {
  const { t } = useTranslation();

  return (
    <div className="sm:col-span-2 z-15 lg:block w-full">
      <footer
        className={`mt-1 p-3 flex flex-row justify-evenly text-center text-xs uppercase bg-teal-800/30 ${className}`}
      >
        <Link className="" to="/privacy">
          {t('privacy_policy.title')}
        </Link>
        <Link to="/tos">{t('tos.title')}</Link>
        <Link to="/faq">{t('faq.title')}</Link>
      </footer>
    </div>
  );
};
