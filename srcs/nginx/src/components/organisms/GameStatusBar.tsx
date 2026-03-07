import { useTranslation } from 'react-i18next';
import { UseGameSessionsReturn } from '../../hooks/GameSessions.tsx';
import type { GameStatus } from '../../types/game.types';

interface GameStatusBarProps {
  className?: string;
  sessionsData: UseGameSessionsReturn | null;
  onSelectSession?: (sessionId: string) => void;
  scoreLeft?: number;
  scoreRight?: number;
  labelLeft?: string;
  labelRight?: string;
  status?: GameStatus;
}

const GameStatusBar = ({
  className = '',
  sessionsData,
  status = 'waiting',
  onSelectSession,
  scoreLeft = 0,
  scoreRight = 0,
  labelLeft,
  labelRight,
}: GameStatusBarProps) => {
  const { t } = useTranslation();

  const statusConfig = {
    waiting: {
      color: 'text-gray-200',
      label: t('game.status_list.waiting'),
    },
    playing: {
      color: 'text-green-400',
      label: t('game.status_list.playing'),
    },
    finished: {
      color: 'text-red-400',
      label: t('game.status_list.finished'),
    },
    paused: {
      color: 'text-blue-400',
      label: t('game.status_list.paused'),
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className={`w-full space-y-4 ${className}`}>
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 mx-auto">
        <div className="flex justify-around text-white">
          <div className="text-center">
            <p className="text-xl  font-quantico text-gray-100">
              {labelLeft || t('game.player_a')}
            </p>
            <p id="player1-score" className="text-3xl font-bold">
              {scoreLeft}
            </p>
          </div>
          <div className="flex flex-col justify-around text-center px-8 border-x border-white/10">
            <p className="text-xs uppercase tracking-wider text-purple-300 opacity-80">
              {t('game.status')}
            </p>
            <p className={`text-xl uppercase font-quantico tracking-widest ${currentStatus.color}`}>
              {currentStatus.label}
            </p>
          </div>
          <div className="text-center ">
            <p className="text-xl  font-quantico text-gray-100">
              {labelRight || t('game.player_b')}
            </p>
            <p id="player2-score" className="text-3xl font-bold">
              {scoreRight}
            </p>
          </div>
        </div>
      </div>

      {sessionsData && (
        <div className="bg-white/5 backdrop-blur text-center rounded-lg p-4 mx-auto">
          {sessionsData.isLoadingSessions && <p>{t('game.loading_sessions')}</p>}
          {sessionsData.error && <p>{sessionsData.error}</p>}
          <button className="rounded-lg" onClick={sessionsData.refetch}>
            {t('game.refresh_sessions')}
          </button>
          <ul>
            {sessionsData.sessionsList.map((session) => (
              <li
                key={session.sessionId}
                onClick={() => onSelectSession?.(session.sessionId)}
                className="cursor-pointer hover:bg-white/10 p-2 rounded transition"
              >
                {session.sessionId} - {session.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GameStatusBar;
