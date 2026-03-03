import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useFooterState } from '../../hooks/useFooterState';

interface FooterProps {
  className?: string;
}

export const Footer = ({ className = '' }: FooterProps) => {
  const { t } = useTranslation();
  const { isCollapsed, toggleCollapsed } = useFooterState();

  return (
    <div className="w-full">
      <footer
        className={`transition-all duration-300 bg-teal-800/30 ${className} ${
          isCollapsed ? 'h-0 overflow-hidden p-0' : 'p-2 sm:p-3'
        }`}
      >
        <div className="flex flex-row justify-evenly text-xs sm:text-sm uppercase gap-2">
          <Link className="hover:text-white transition-colors" to="/privacy">
            {t('privacy_policy.title')}
          </Link>
          <Link className="hover:text-white transition-colors" to="/tos">
            {t('tos.title')}
          </Link>
        </div>
      </footer>
      <button
        onClick={toggleCollapsed}
        className="w-full bg-teal-800/40 py-0.5 flex justify-center items-center hover:bg-teal-800/60 transition-colors text-white/60 hover:text-white"
        aria-label={
          isCollapsed ? t('footer.show', 'Afficher footer') : t('footer.hide', 'Masquer footer')
        }
      >
        {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
    </div>
  );
};
