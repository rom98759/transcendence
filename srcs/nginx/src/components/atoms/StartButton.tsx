import { useTranslation } from 'react-i18next';

interface StartButtonProps {
  label: string;
  isready?: boolean;
  onStart?: () => void;
}
export function StartButton({ label, isready = false, onStart }: StartButtonProps) {
  const canStart = isready;
  const { t } = useTranslation();

  return (
    <div
      className={`
        flex items-center text-center gap-2 px-2 py-1 rounded-full
        text-sm font-medium font-quantico w-48
        backdrop-blur border border-cyan-200  mx-auto my-10
        ${!isready ? 'bg-red-500 text-white shadow-lg' : 'bg-white/70 text-gray-600'}
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
        {t('game.start_button')}
      </button>
    </div>
  );
}
