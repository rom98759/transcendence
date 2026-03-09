// ============================================================================
// GamePage — Orchestrateur : machine à états 3 écrans
//
//   'start'    → StartGameScreen   (créer local / remote / rejoindre)
//   'playing'  → GamePlayScreen    (arena + pré-jeu overlay)
//   'gameover' → GameOverScreen    (winner / score / action)
//
// Toute la logique WS, sessions et lobby reste ici.
// Les 3 écrans reçoivent uniquement des props : aucun appel réseau en dehors.
// ============================================================================

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useGameWebSocket } from '../hooks/GameWebSocket';
import { useGameState } from '../hooks/GameState';
import { useGameLobby } from '../hooks/useGameLobby';
import { useGameSession } from '../hooks/useGameSession';
import { useGameSessions } from '../hooks/GameSessions';
import { useKeyboardControls } from '../hooks/input.tsx';
import api from '../api/api-client';
import Background from '../components/atoms/Background';
import StartGameScreen from '../components/organisms/game/StartGameScreen';
import GamePlayScreen from '../components/organisms/game/GamePlayScreen';
import GameOverScreen from '../components/organisms/game/GameOverScreen';
import type {
  ServerMessage,
  Scores,
  GameStatus,
  BackgroundMode,
  GameMode,
} from '../types/game.types';

// Re-export : certains composants importent BackgroundMode depuis GamePage
export type { BackgroundMode } from '../types/game.types';

// ── Types ────────────────────────────────────────────

/** Les 3 écrans du flux de jeu */
type GameScreen = 'start' | 'playing' | 'gameover';

interface MatchToPlayResponse {
  sessionId: string;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ── Constantes ───────────────────────────────────────────────────────────────

const BG_COLORS = { start: '#00ff9f', end: '#0088ff' };

// ── Composant ────────────────────────────────────────────────────────────────

export const GamePage = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const { tournamentId } = useParams<{ tournamentId?: string }>();
  const { username: targetFriend } = useParams<{ username?: string }>();

  // ── Déduction du gameMode depuis l'URL
  const gameModeFromUrl = tournamentId ? 'tournament' : targetFriend ? 'remote' : null;
  const [gameMode, setGameMode] = useState<GameMode | null>(gameModeFromUrl);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const {
    openWebSocket,
    openWebSocketWithRetry,
    closeWebSocket,
    connected: wsConnected,
  } = useGameWebSocket();
  const { gameStateRef, updateGameState } = useGameState();
  const {
    lobby,
    onConnected,
    onPlayersUpdate,
    onReadyCheck,
    onPlayerReady,
    onPlayerDisconnected,
    onGameStart,
    onGameOver: onLobbyGameOver,
    reset: resetLobby,
  } = useGameLobby();
  const sessions = useGameSessions(gameMode === 'remote');

  // ── État local ─────────────────────────────────────────────────────────────
  const [scores, setScores] = useState<Scores>({ left: 0, right: 0 });
  const [winner, setWinner] = useState<'left' | 'right' | null>(null);
  const [bgMode, setBgMode] = useState<BackgroundMode>('psychedelic');
  const [forfeit, setForfeit] = useState(false);
  const [readyCheckReceived, setReadyCheckReceived] = useState(false);
  const [readySent, setReadySent] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [nextMatchSessionId, setNextMatchSessionId] = useState<string | null>(null);
  const [isResolvingTournamentNextMatch, setIsResolvingTournamentNextMatch] = useState(false);

  // ── Machine à états : écran courant ───────────────────────────────
  const [screen, setScreen] = useState<GameScreen>(gameMode === 'tournament' ? 'playing' : 'start');

  // ── Refs (stables, accessibles dans les closures WS) ──────────────────
  const wsRef = useRef<WebSocket | null>(null);
  const phaseRef = useRef<'idle' | 'playing' | 'gameOver'>('idle');
  const scoresRef = useRef<Scores>({ left: 0, right: 0 });

  // ── Session ────────────────────────────────────────────────────────────────
  const onBeforeCreate = useCallback(() => {
    closeWebSocket();
    wsRef.current = null;
    resetLobby();
    setWinner(null);
    setForfeit(false);
    setReadyCheckReceived(false);
    setReadySent(false);
    setScores({ left: 0, right: 0 });
    scoresRef.current = { left: 0, right: 0 };
    phaseRef.current = 'idle';
    setConnectionError(null);
  }, [closeWebSocket, resetLobby]);

  const {
    sessionId: currentSessionId,
    isLoading,
    activeMode,
    createSession,
    exitSession,
  } = useGameSession({
    gameMode: gameMode === 'tournament' ? 'tournament' : 'remote',
    initialSessionId: null,
    onBeforeCreate,
    autoCreate: gameMode === 'tournament',
  });

  const isTournamentMode = gameMode === 'tournament';

  // ── Clavier ────────────────────────────────────────────────────────────────
  useKeyboardControls({
    wsRef,
    gameMode: activeMode,
    playerRole: lobby.localPlayer?.role ?? null,
    enabled: wsConnected && screen === 'playing',
  });

  // ── Handler WS (réutilisé dans deux endroits) ──────────────────────────────
  const handleWsMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case 'connected':
          onConnected(msg.player, msg.sessionName);
          break;
        case 'player_joined':
          onPlayersUpdate(msg.players);
          break;
        case 'ready_check':
          onReadyCheck(msg.players);
          setReadyCheckReceived(true);
          break;
        case 'player_ready':
          onPlayerReady(msg.players);
          break;
        case 'player_disconnected': {
          onPlayerDisconnected(msg.players, msg.message);
          setForfeit(true);
          break;
        }
        case 'state': {
          phaseRef.current = 'playing';
          onGameStart();
          updateGameState(msg.data);
          const s = msg.data.scores;
          if (s.left !== scoresRef.current.left || s.right !== scoresRef.current.right) {
            scoresRef.current = s;
            setScores(s);
          }
          break;
        }
        case 'gameOver': {
          phaseRef.current = 'gameOver';
          onLobbyGameOver();
          const { scores: s, winner: w } = msg.gameOverData;
          scoresRef.current = s;
          setScores(s);
          setWinner(w);
          setScreen('gameover');
          if (gameMode === 'tournament') {
            void resolveTournamentNextStep();
          }
          break;
        }
        case 'error':
          console.error('[WS]', msg.message);
          break;
        default:
          break;
      }
    },
    [
      onConnected,
      onPlayersUpdate,
      onReadyCheck,
      onPlayerReady,
      onPlayerDisconnected,
      onGameStart,
      updateGameState,
      onLobbyGameOver,
      gameMode,
      resolveTournamentNextStep,
    ],
  );

  // ── Connexion WebSocket ────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentSessionId) return;
    let cancelled = false;

    const connect = async () => {
      const ws = await openWebSocket(currentSessionId, (msg: ServerMessage) => {
        if (!cancelled) handleWsMessage(msg);
      });
      if (cancelled) {
        ws.close();
        return;
      }
      wsRef.current = ws;
      ws.addEventListener('close', () => {
        if (phaseRef.current !== 'gameOver' && wsRef.current === ws) {
          resetLobby();
          phaseRef.current = 'idle';
        }
      });
    };

    connect();
    return () => {
      cancelled = true;
      closeWebSocket();
      wsRef.current = null;
      resetLobby();
    };
  }, [currentSessionId]);

  // ── Callbacks exposés aux écrans ───────────────────────────────────────────

  /** Créer une partie locale → écran de jeu */
  const handleCreateLocal = useCallback(async () => {
    setGameMode('local');
    await createSession('local');
    setScreen('playing');
  }, [createSession]);

  /** Créer une partie IA → écran de jeu */
  const handleCreateAi = useCallback(async () => {
    setGameMode('ai');
    await createSession('ai');
    setScreen('playing');
  }, [createSession]);

  /** Créer une partie remote → écran de jeu */
  const handleCreateRemote = useCallback(async () => {
    setGameMode('remote');
    await createSession('remote');
    setScreen('playing');
  }, [createSession]);

  /** Rejoindre une session existante depuis la liste → écran de jeu */
  const handleJoinSession = useCallback(
    (id: string) => {
      setConnectionError(null);

      // Vérifier que la session est encore valide
      const sessionExists = sessions.sessionsList?.some((s) => s.sessionId === id);
      if (!sessionExists) {
        setConnectionError(t('game.error.session_not_found'));
        setScreen('start');
        return;
      }

      onBeforeCreate();
      phaseRef.current = 'idle';

      // Utiliser la version avec retry automatique
      openWebSocketWithRetry(id, handleWsMessage)
        .then((ws) => {
          wsRef.current = ws;
          setConnectionError(null);
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : t('game.error.connection_failed');
          setConnectionError(message);
          setScreen('start');
          console.error('[JoinSession] Connection failed:', err);
        });

      setScreen('playing');
    },
    [onBeforeCreate, openWebSocketWithRetry, handleWsMessage, sessions.sessionsList, t],
  );

  /** Bouton "Je suis prêt" dans l'overlay pré-jeu */
  const handleSendReady = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'ready' }));
    setReadySent(true);
  }, []);

  /** Rejouer : recrée une session du même mode actif */
  const handlePlayAgain = useCallback(async () => {
    if (activeMode === 'remote') {
      onBeforeCreate();
      setScreen('start');
    } else {
      await createSession(activeMode);
      setScreen('playing');
    }
  }, [activeMode, createSession, onBeforeCreate]);

  /** Quitter → supprime la session et navigue vers /home */
  const handleExit = useCallback(async () => {
    await exitSession();
  }, [exitSession]);

  const handleNextTournamentMatch = useCallback(async () => {
    if (!isTournamentMode) return;

    setNextMatchSessionId(null);

    try {
      await createSession('tournament');
      setScreen('playing');
    } catch {
      // Session creation failed — go to bracket page to see what's happening
      navigate(`/tournaments/${tournamentId}`);
    }
  }, [createSession, isTournamentMode, tournamentId, navigate]);

  const handleShowTournamentResults = useCallback(async () => {
    if (!isTournamentMode || !tournamentId) {
      await handleExit();
      return;
    }
    // Navigate to the bracket page — it auto-redirects to /results when FINISHED
    navigate(`/tournaments/${tournamentId}`);
  }, [isTournamentMode, tournamentId, handleExit, navigate]);

  // ── Dérivés pour les composants ────────────────────────────────────────────
  const isPlaying = lobby.phase === 'playing';
  const gameStatus: GameStatus =
    screen === 'gameover' ? 'finished' : isPlaying ? 'playing' : 'waiting';

  const labelLeft =
    lobby.players.find((p) => p.role === 'A')?.username ??
    (activeMode === 'ai'
      ? lobby.localPlayer?.role === 'A'
        ? t('game.winner.you_label')
        : t('game.winner.ai_label')
      : t('game.winner.player1_label'));
  const labelRight =
    lobby.players.find((p) => p.role === 'B')?.username ??
    (activeMode === 'ai'
      ? lobby.localPlayer?.role === 'B'
        ? t('game.winner.you_label')
        : t('game.winner.ai_label')
      : t('game.winner.player2_label'));

  const awaitingReady = readyCheckReceived && !readySent;

  async function resolveTournamentNextStep() {
    if (!isTournamentMode || !tournamentId) return;

    setIsResolvingTournamentNextMatch(true);

    try {
      let nextSessionId: string | null = null;

      const maxAttempts = 5;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await api.get<MatchToPlayResponse | null>(
            `/game/tournaments/${tournamentId}/match-to-play`,
          );
          if (response.data?.sessionId) {
            nextSessionId = response.data.sessionId;
            break;
          }
          // Backend returns 200 null when no match — may be transitoire after a match ends
          if (attempt < maxAttempts) {
            await wait(600);
            continue;
          }
        } catch {
          // Erreur réseau/serveur: on retente quelques fois
          if (attempt < maxAttempts) {
            await wait(600);
            continue;
          }
        }
      }

      if (nextSessionId) {
        setNextMatchSessionId(nextSessionId);
        return;
      }

      // No more matches for this player — go to bracket (auto-redirects to /results if FINISHED)
      setNextMatchSessionId(null);
      navigate(`/tournaments/${tournamentId}`);
    } finally {
      setIsResolvingTournamentNextMatch(false);
    }
  }

  useEffect(() => {
    if (!isTournamentMode) return;
    if (isLoading) return;
    if (currentSessionId) return;

    // Aucun match actif pour ce joueur : afficher directement les résultats
    void resolveTournamentNextStep();
  }, [isTournamentMode, isLoading, currentSessionId]);

  useEffect(() => {
    // Routes simplifiées : pas besoin de naviguer pour local/ai
    // Rester sur /game et laisser gameMode être géré par l'état local
    if (!isTournamentMode && !targetFriend) {
      return;
    }

    // Vérifier que la route actuelle correspond au gameMode
    const shouldBeOnTournamentRoute = isTournamentMode && tournamentId;
    const shouldBeOnRemoteRoute = targetFriend && gameMode === 'remote';

    if (
      shouldBeOnTournamentRoute &&
      !location.pathname.includes(`/game/tournament/${tournamentId}`)
    ) {
      navigate(`/game/tournament/${tournamentId}`, { replace: true });
    }

    if (shouldBeOnRemoteRoute && !location.pathname.includes(`/game/remote/${targetFriend}`)) {
      navigate(`/game/remote/${targetFriend}`, { replace: true });
    }
  }, [gameMode, isTournamentMode, targetFriend, tournamentId, location.pathname, navigate]);

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full relative overflow-hidden">
      <Background
        grainIntensity={4}
        baseFrequency={0.28}
        colorStart={BG_COLORS.start}
        colorEnd={BG_COLORS.end}
        animated={false}
      >
        {/* ── Écran 1 : Démarrage ── */}
        {screen === 'start' && (
          <StartGameScreen
            isLoading={isLoading}
            sessionsData={sessions}
            onCreateAi={handleCreateAi}
            onCreateLocal={handleCreateLocal}
            onCreateRemote={handleCreateRemote}
            onJoinSession={handleJoinSession}
            connectionError={connectionError}
            friendNameFilter={targetFriend}
          />
        )}

        {/* ── Écran 2 : Jeu en cours ── */}
        {screen === 'playing' && (
          <GamePlayScreen
            gameStatus={gameStatus}
            scores={scores}
            labelLeft={labelLeft}
            labelRight={labelRight}
            gameMode={activeMode}
            lobbyPhase={lobby.phase}
            playersCount={lobby.players.length}
            awaitingReady={awaitingReady}
            gameStateRef={gameStateRef}
            bgMode={bgMode}
            onChangeBgMode={setBgMode}
            onReady={handleSendReady}
            onExit={handleExit}
          />
        )}

        {/* ── Écran 3 : Game Over ── */}
        {screen === 'gameover' && winner && (
          <GameOverScreen
            winner={winner}
            scores={scores}
            gameMode={activeMode}
            labelLeft={labelLeft}
            labelRight={labelRight}
            localRole={lobby.localPlayer?.role ?? null}
            isForfeit={forfeit}
            onPlayAgain={handlePlayAgain}
            onNextMatch={nextMatchSessionId ? handleNextTournamentMatch : undefined}
            onViewResults={isTournamentMode ? handleShowTournamentResults : undefined}
            isTournamentProgressLoading={isResolvingTournamentNextMatch}
            onExit={handleExit}
          />
        )}
      </Background>
    </div>
  );
};
