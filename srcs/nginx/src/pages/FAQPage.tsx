import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Background from '../components/atoms/Background';
import { NavBar } from '../components/molecules/NavBar';
import { useAuth } from '../providers/AuthProvider';

const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface FAQEntry {
  q: string;
  a: string;
}

interface FAQSection {
  id: string;
  icon: string;
  title: string;
  entries: FAQEntry[];
}

// ─────────────────────────────────────────────
// Accordion Item
// ─────────────────────────────────────────────

const AccordionItem = ({
  entry,
  isOpen,
  onToggle,
  index,
  id,
}: {
  entry: FAQEntry;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
  id: string;
}) => {
  const btnId = `btn-${id}`;
  const panelId = `panel-${id}`;

  return (
    <div
      className={`rounded-xl overflow-hidden transition-shadow duration-300 ${
        isOpen
          ? 'shadow-[0_4px_20px_rgba(0,255,159,0.08)] ring-1 ring-cyan-500/30'
          : 'shadow-sm ring-1 ring-gray-200/60 hover:ring-cyan-300/40 hover:shadow-md'
      }`}
    >
      <button
        type="button"
        id={btnId}
        onClick={onToggle}
        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                    isOpen
                      ? 'bg-gradient-to-r from-cyan-50 to-blue-50'
                      : 'bg-white hover:bg-gray-50/80'
                  }`}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        {/* Numéro de question */}
        <span
          className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors duration-200 ${
            isOpen
              ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-sm shadow-cyan-500/40'
              : 'bg-gray-100 text-gray-400'
          }`}
          aria-hidden="true"
        >
          {index + 1}
        </span>

        <span
          className={`flex-1 font-medium text-sm sm:text-base leading-snug transition-colors duration-200 ${
            isOpen ? 'text-cyan-800' : 'text-gray-800'
          }`}
        >
          {entry.q}
        </span>

        {/* Chevron animé */}
        <svg
          className={`flex-shrink-0 w-5 h-5 transition-all duration-300 ${
            isOpen ? 'rotate-180 text-cyan-500' : 'rotate-0 text-gray-400'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={btnId}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 py-4 bg-white border-t border-cyan-100">
          <div className="pl-10">
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{entry.a}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Section bloc
// ─────────────────────────────────────────────

const FAQSectionBlock = ({ section }: { section: FAQSection }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => setOpenIndex((prev) => (prev === idx ? null : idx));

  return (
    <div className="mb-6">
      {/* Header de section */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-300/30 shadow-sm">
          <span className="text-lg leading-none" aria-hidden="true">
            {section.icon}
          </span>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-gray-800 tracking-tight">
          {section.title}
        </h2>
        <span className="ml-auto text-xs text-gray-400 font-medium tabular-nums">
          {section.entries.length}
        </span>
      </div>

      {/* Accordions */}
      <div className="flex flex-col gap-2">
        {section.entries.map((entry, idx) => (
          <AccordionItem
            key={idx}
            index={idx}
            id={`${section.id}-${idx}`}
            entry={entry}
            isOpen={openIndex === idx}
            onToggle={() => toggle(idx)}
          />
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// FAQPage
// ─────────────────────────────────────────────

/**
 * FAQPage — Foire Aux Questions accessible à tous (connecté ou non).
 * Couvre : login/accès, 2FA, compte, jeu/tournoi, erreurs communes.
 */
export const FAQPage = () => {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();

  const backPath = isLoggedIn ? '/home' : '/welcome';

  const sections: FAQSection[] = [
    {
      id: 'login',
      icon: '🔑',
      title: t('faq.sections.login.title'),
      entries: [
        { q: t('faq.sections.login.q1.q'), a: t('faq.sections.login.q1.a') },
        { q: t('faq.sections.login.q2.q'), a: t('faq.sections.login.q2.a') },
        { q: t('faq.sections.login.q3.q'), a: t('faq.sections.login.q3.a') },
        { q: t('faq.sections.login.q4.q'), a: t('faq.sections.login.q4.a') },
      ],
    },
    {
      id: 'twofa',
      icon: '🛡️',
      title: t('faq.sections.twofa.title'),
      entries: [
        { q: t('faq.sections.twofa.q1.q'), a: t('faq.sections.twofa.q1.a') },
        { q: t('faq.sections.twofa.q2.q'), a: t('faq.sections.twofa.q2.a') },
        { q: t('faq.sections.twofa.q3.q'), a: t('faq.sections.twofa.q3.a') },
        { q: t('faq.sections.twofa.q4.q'), a: t('faq.sections.twofa.q4.a') },
        { q: t('faq.sections.twofa.q5.q'), a: t('faq.sections.twofa.q5.a') },
      ],
    },
    {
      id: 'account',
      icon: '👤',
      title: t('faq.sections.account.title'),
      entries: [
        { q: t('faq.sections.account.q1.q'), a: t('faq.sections.account.q1.a') },
        { q: t('faq.sections.account.q2.q'), a: t('faq.sections.account.q2.a') },
        { q: t('faq.sections.account.q3.q'), a: t('faq.sections.account.q3.a') },
      ],
    },
    {
      id: 'game',
      icon: '🏓',
      title: t('faq.sections.game.title'),
      entries: [
        { q: t('faq.sections.game.q1.q'), a: t('faq.sections.game.q1.a') },
        { q: t('faq.sections.game.q2.q'), a: t('faq.sections.game.q2.a') },
        { q: t('faq.sections.game.q3.q'), a: t('faq.sections.game.q3.a') },
      ],
    },
    {
      id: 'errors',
      icon: '⚠️',
      title: t('faq.sections.errors.title'),
      entries: [
        { q: t('faq.sections.errors.q1.q'), a: t('faq.sections.errors.q1.a') },
        { q: t('faq.sections.errors.q2.q'), a: t('faq.sections.errors.q2.a') },
        { q: t('faq.sections.errors.q3.q'), a: t('faq.sections.errors.q3.a') },
        { q: t('faq.sections.errors.q4.q'), a: t('faq.sections.errors.q4.a') },
      ],
    },
  ];

  return (
    <div className="w-full h-full">
      <Background
        grainIntensity={4}
        baseFrequency={0.28}
        colorStart={colors.start}
        colorEnd={colors.end}
      >
        <div className="w-full h-full flex flex-col">
          <NavBar />

          {/* Conteneur scrollable — prend l'espace restant sous la navbar */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col items-center px-4 py-10">
              {/* Carte principale — même style que TwoFactorPage */}
              <div className="w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,255,159,0.15),0_0_100px_rgba(0,136,255,0.1)] border border-white/40 overflow-hidden">
                {/* En-tête de la carte */}
                <div className="px-8 pt-8 pb-6 border-b border-gray-100 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/40 mb-4">
                    <svg
                      className="w-7 h-7 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent mb-1 font-quantico tracking-wide">
                    {t('faq.title')}
                  </h1>
                  <p className="text-sm text-gray-500">{t('faq.subtitle')}</p>
                </div>

                {/* Contenu — sections */}
                <div className="px-6 sm:px-8 py-6 space-y-8">
                  {sections.map((section, sIdx) => (
                    <div key={section.id}>
                      <FAQSectionBlock section={section} />
                      {/* Séparateur entre sections (sauf le dernier) */}
                      {sIdx < sections.length - 1 && (
                        <div className="mt-6 border-t border-gray-100" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Pied de carte */}
                <div className="px-8 py-6 bg-gray-50/70 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <Link
                    to={backPath}
                    className="flex-shrink-0 px-5 py-2.5 bg-gradient-to-r from-[#00ff9f] to-[#0088ff]
                             text-white text-sm font-semibold rounded-xl shadow-md
                             hover:shadow-[0_4px_20px_rgba(0,255,159,0.3)]
                             transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    ← {t('faq.back')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Background>
    </div>
  );
};
