import { NavDropdown } from './NavDropDown';
import { useHoverMenu } from '../../hooks/HoverMenu';
import { useTranslation } from 'react-i18next';

interface LocaleProps {
  initialLanguage?: string;
  className?: string;
}

const countries: Record<string, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  tf: '🔫',
};

export const Locale = ({ className }: LocaleProps) => {
  const { i18n } = useTranslation();
  const { isOpen, onMouseEnter, onMouseLeave } = useHoverMenu();
  const currentLang = i18n.language.split('-')[0];

  const selectLanguage = (code: string) => {
    i18n.changeLanguage(code);
  };

  return (
    <div
      className={`
          relative inline-block ${className}
        `}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button className="w-10 h-10 bg-white/20 border-gray-200/80 rounded-full overflow-hidden border-2 shadow-sm flex items-center justify-center hover:bg-white transition-colors">
        <span className="text-xl">{countries[currentLang] || '🌐'}</span>
      </button>

      <NavDropdown isOpen={isOpen} yTranslate={6}>
        <ul className="flex flex-col items-center space-y-3 w-full">
          {Object.entries(countries).map(([code, flag]) => (
            <li key={code} className="w-full">
              <button
                onClick={() => selectLanguage(code)}
                className={`w-full text-center py-1 text-sm font-medium transition-transform hover:scale-110
                  ${currentLang === code ? 'text-slate-900' : 'text-slate-300'}`}
              >
                {flag} <span className="uppercase ml-1">{code}</span>
              </button>
            </li>
          ))}
        </ul>
      </NavDropdown>
    </div>
  );
};
