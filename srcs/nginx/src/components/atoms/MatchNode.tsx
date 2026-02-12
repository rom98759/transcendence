import { MatchStatus } from '../../types/types';
import { useTranslation } from 'react-i18next';

interface MatchNodeProps {
  label: string;
  status: MatchStatus;
  highlight?: boolean;
  onStart?: () => void;
}

export function MatchNode({ label, status, highlight = false, onStart }: MatchNodeProps) {
  const canStart = status === 'ready';
  const { t } = useTranslation();

  return (
    <div
      className={`
        flex items-center gap-4 px-6 py-3 rounded-full
        text-sm font-medium font-quantico
        backdrop-blur border border-cyan-200
        ${highlight ? 'bg-cyan-500 text-white shadow-lg' : 'bg-white/70 text-gray-600'}
      `}
    >
      {/* Label */}
      <span>{label}</span>

      {/* Start button */}
      <button
        onClick={onStart}
        disabled={!canStart}
        className={`
          px-4 py-1.5 rounded-full text-xs font-semibold
          transition-all
          ${
            canStart
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105 active:scale-100'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
        aria-disabled={!canStart}
      >
        {t('game.start')}
      </button>
    </div>
  );
}
