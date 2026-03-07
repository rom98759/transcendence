import { useTranslation } from 'react-i18next';
import type { MatchStatus } from '../../types/types';

interface MatchNodeProps {
  label: string;
  status: MatchStatus;
  highlight?: boolean;
  /** Formatted score string, e.g. "3 - 1" */
  score?: string | null;
  /** Winner username */
  winner?: string | null;
  /** Whether the current user can start/join this match */
  canPlay?: boolean;
  onPlay?: () => void;
}

export function MatchNode({
  label,
  status,
  highlight = false,
  score,
  winner,
  canPlay,
  onPlay,
}: MatchNodeProps) {
  const { t } = useTranslation();

  const borderColor =
    status === 'finished'
      ? 'border-emerald-400/60'
      : status === 'running'
        ? 'border-amber-400/60'
        : highlight
          ? 'border-cyan-400/60'
          : 'border-cyan-200/30';

  const bgColor =
    status === 'finished'
      ? 'bg-emerald-500/15'
      : status === 'running'
        ? 'bg-amber-500/15'
        : highlight
          ? 'bg-cyan-500/20'
          : 'bg-white/10';

  return (
    <div
      className={`
        flex flex-col items-center gap-1 px-5 py-2.5 rounded-2xl min-w-[140px]
        text-sm font-medium font-quantico
        backdrop-blur border
        ${borderColor} ${bgColor}
      `}
    >
      {/* Round label */}
      <span className="text-xs uppercase tracking-wider text-white/60">{label}</span>

      {/* Score (visible only for finished matches) */}
      {score && <span className="text-white text-base font-bold">{score}</span>}

      {/* Winner name */}
      {winner && <span className="text-emerald-300 text-xs truncate max-w-[120px]">{winner}</span>}

      {/* Play button — appears only when it is this user's match to play */}
      {canPlay && onPlay && (
        <button
          onClick={onPlay}
          className="mt-1 px-4 py-1 rounded-full text-xs font-semibold
            bg-emerald-500 text-white hover:bg-emerald-600
            hover:scale-105 active:scale-100 transition-all animate-pulse"
        >
          {t('game.play')}
        </button>
      )}

      {/* In-progress indicator for matches the user is not in */}
      {status === 'running' && !canPlay && (
        <span className="text-amber-300 text-xs animate-pulse">{t('game.in_progress')}</span>
      )}
    </div>
  );
}
