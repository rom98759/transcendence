import { useState } from 'react';

interface LocaleProps {
  initialLanguage?: string;
  className?: string;
}

const countries: Record<string, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
};

export const Locale = ({ initialLanguage = 'fr', className }: LocaleProps) => {
  const [language, setLanguage] = useState(initialLanguage);
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);
  const selectLanguage = (code: string) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className={`${className}`}>
      <div
        className={`
          relative inline-block
        `}
      >
        <button
          onClick={toggleMenu}
          className="w-10 h-10 border-gray-200/80 rounded-full overflow-hidden border-2 shadow-sm flex items-center justify-center hover:bg-white transition-colors"
        >
          {countries[language] || '🌐'}
        </button>

        {isOpen && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-white/80 border border-gray-200 rounded-lg shadow-lg py-2 z-10">
            {Object.entries(countries).map(([code, flag]) => (
              <button
                key={code}
                onClick={() => selectLanguage(code)}
                className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-lg"
              >
                <span className="mr-2">{flag}</span>
                <span className="test-sm text-gray-700">{code}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
