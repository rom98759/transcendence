// ============================================================================
// StartGameScreen — Écran de démarrage : créer une partie locale / remote
// ou rejoindre une session existante via la liste des matchs.
//
// Layout :
//   Left  → deux CircleButton (Local, Remote)
//   Right → bouton "Rejoindre" + liste des sessions disponibles
// ============================================================================

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleButton } from '../../atoms/CircleButtonSimple';
import type { UseGameSessionsReturn, GameSession } from '../../../hooks/GameSessions';
import { NavBar } from '../../molecules/NavBar';

interface StartGameScreenProps {
  isLoading: boolean;
  /** Données des sessions distantes (remote uniquement) */
  sessionsData: UseGameSessionsReturn | null;
  onCreateLocal: () => void;
  onCreateRemote: () => void;
  onJoinSession: (sessionId: string) => void;
  connectionError?: string | null;
}

// ── Sous-composant : un item de liste de matchs ──────────────────────────────
const SessionItem = ({
  session,
  onJoin,
}: {
  session: GameSession;
  onJoin: (id: string) => void;
}) => {
  return (
    <button
      className="w-full flex items-center justify-between px-4 py-3 rounded-lg
                 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/50
                 transition-colors cursor-pointer text-left group"
      onClick={() => onJoin(session.sessionId)}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-gray-100 font-mono text-sm group-hover:text-white">
          {session.sessionName || session.sessionId}
        </span>
        {session.playerCount !== undefined && (
          <span className="text-gray-400 font-mono text-xs">{session.playerCount}/2</span>
        )}
      </div>
    </button>
  );
};

// ── Composant principal ──────────────────────────────────────────────────────
const StartGameScreen = ({
  isLoading,
  sessionsData,
  onCreateLocal,
  onCreateRemote,
  onJoinSession,
  connectionError,
}: StartGameScreenProps) => {
  const { t } = useTranslation('common');

  const {
    sessionsList = [],
    isLoadingSessions = false,
    error = null,
    refetch,
  } = sessionsData ?? {};

  // ── Rafraîchir les sessions au montage pour éviter le cache ──
  useEffect(() => {
    if (refetch) {
      refetch();
    }
  }, [refetch]);

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="sticky top-0 z-50 w-full">
        <NavBar />
      </div>

      {/* ── Erreur de connexion ── */}
      {connectionError && (
        <div className="bg-red-950/90 border border-red-700 text-red-200 px-4 py-3 text-center font-mono text-sm">
          {connectionError}
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-12 py-8">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-24">
          {/* ── Colonne gauche : créer une partie ── */}
          <section className="flex flex-col items-center justify-center gap-8">
            <h2 className="text-black font-mono text-sm uppercase tracking-widest bg-white/80 border border-white/20 rounded-lg px-4 py-2">
              {t('game.start.create_title', 'Créer une partie')}
            </h2>

            <div className="flex flex-col items-center gap-2">
              {/* Sommet : bouton AI */}
              <div className="flex justify-center">
                <CircleButton
                  onClick={onCreateLocal}
                  disabled={isLoading}
                  title={t('game.start.vs_ai', "Jouer contre l'IA")}
                >
                  <span className="text-center font-mono text-sm leading-tight px-1">
                    {isLoading ? t('global.loading') : t('game.start.vs_ai', 'VS\nIA')}
                  </span>
                </CircleButton>
              </div>

              {/* Base : Local + Remote */}
              <div className="flex flex-row justify-center">
                <CircleButton
                  onClick={onCreateLocal}
                  disabled={isLoading}
                  title={t('game.start.local', 'Partie locale')}
                >
                  <span className="text-center font-mono text-sm leading-tight px-1">
                    {isLoading ? t('global.loading') : t('game.start.local', 'Partie\nLocale')}
                  </span>
                </CircleButton>

                <CircleButton
                  onClick={onCreateRemote}
                  disabled={isLoading}
                  title={t('game.start.remote', 'Partie en ligne')}
                >
                  <span className="text-center font-mono text-sm leading-tight px-1">
                    {isLoading ? t('global.loading') : t('game.start.remote', 'Partie\nRemote')}
                  </span>
                </CircleButton>
              </div>
            </div>
          </section>

          {/* ── Colonne droite : rejoindre une session ── */}
          <section className="flex flex-col gap-4">
            {/* Header + titre */}
            <h2 className="text-black font-mono text-sm uppercase tracking-widest bg-white/80 border border-white/20 rounded-lg px-4 py-2">
              {t('game.start.match_list', 'Liste des matchs')}
            </h2>

            {/* Panel liste des sessions */}
            <div className="flex flex-col rounded-xl overflow-hidden border border-white/10">
              {/* Header coloré avec bouton refresh */}
              <div className="bg-blue-600/80 px-4 py-2 flex items-center justify-between">
                <p className="text-white font-mono text-xs uppercase tracking-wider">
                  {t('game.start.available_sessions', 'Sessions disponibles')}
                </p>
                {refetch && (
                  <button
                    onClick={refetch}
                    className="text-white font-mono text-xs uppercase tracking-wider hover:text-blue-200 transition-colors"
                    title={t('global.refresh', 'Actualiser')}
                  >
                    {t('global.refresh', 'Actualiser')}
                  </button>
                )}
              </div>

              {/* Corps scrollable */}
              <div className="bg-slate-900/80 flex flex-col gap-2 p-3 min-h-48 max-h-72 overflow-y-auto">
                {isLoadingSessions && (
                  <div className="flex items-center justify-center flex-1 py-8">
                    <span className="animate-pulse text-gray-400 font-mono text-sm">
                      {t('global.loading')}
                    </span>
                  </div>
                )}

                {error && !isLoadingSessions && (
                  <p className="text-red-400 font-mono text-xs text-center py-4">{error}</p>
                )}

                {!isLoadingSessions && !error && sessionsList.length === 0 && (
                  <p className="text-gray-500 font-mono text-xs text-center py-8">
                    {t('game.start.no_sessions', 'Aucune session disponible')}
                  </p>
                )}

                {!isLoadingSessions &&
                  sessionsList.map((session: GameSession) => (
                    <SessionItem key={session.sessionId} session={session} onJoin={onJoinSession} />
                  ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default StartGameScreen;
