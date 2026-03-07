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
import TournamentResultsScreen, {
  TournamentHistoryMatch,
} from '../components/organisms/game/TournamentResultsScreen';
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
type GameScreen = 'start' | 'playing' | 'gameover' | 'tournament_results';

interface MatchToPlayResponse {
  sessionId: string;
  id: number;
  round: string;
  player1: number;
  player2: number;
}

interface TournamentPlayerResponse {
  player_id: number;
  username: string;
  avatar: string | null;
  slot: 1 | 2 | 3 | 4;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface GamePageProps {
  /** Session pré-sélectionnée (mode tournament : fournie par TournamentPage) */
  sessionId: string | null;
  /**
   * Mode initial. En mode tournament, sessionId est fourni et on démarre
   * directement sur l'écran de jeu. Pour tous les autres modes, on démarre
   * sur l'écran de démarrage.
   */
  gameMode: GameMode;
}

// ── Constantes ───────────────────────────────────────────────────────────────

const BG_COLORS = { start: '#00ff9f', end: '#0088ff' };

// ── Composant ────────────────────────────────────────────────────────────────

export const GamePage = ({ sessionId, gameMode }: GamePageProps) => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const { tournamentId } = useParams<{ tournamentId?: string }>();
  const { username: targetFriend } = useParams<{ username?: string }>();

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
  const [tournamentResults, setTournamentResults] = useState<TournamentHistoryMatch[]>([]);
  const [tournamentResultsError, setTournamentResultsError] = useState<string | null>(null);

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
    gameMode,
    initialSessionId: sessionId,
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
    await createSession('local');
    setScreen('playing');
  }, [createSession]);

  /** Créer une partie IA → écran de jeu */
  const handleCreateAi = useCallback(async () => {
    await createSession('ai');
    setScreen('playing');
  }, [createSession]);

  /** Créer une partie remote → écran de jeu */
  const handleCreateRemote = useCallback(async () => {
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

    setTournamentResultsError(null);
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

  async function loadTournamentResults() {
    if (!tournamentId) {
      setTournamentResults([]);
      setTournamentResultsError(t('game.tournament_results.unavailable'));
      return;
    }

    try {
      setTournamentResultsError(null);

      const [historyRes, playersRes] = await Promise.all([
        api.get<TournamentHistoryMatch[]>('/game/history'),
        api.get<TournamentPlayerResponse[]>(`/game/tournaments/${tournamentId}`),
      ]);

      const playersById = new Map<number, string>(
        playersRes.data.map((player) => [player.player_id, player.username]),
      );

      const roundOrder: Record<string, number> = {
        SEMI_1: 1,
        SEMI_2: 2,
        LITTLE_FINAL: 3,
        FINAL: 4,
      };

      const results = historyRes.data
        .filter((match) => String(match.tournament_id) === String(tournamentId))
        .filter((match) => typeof match.round === 'string' && match.round in roundOrder)
        .sort((a, b) => roundOrder[a.round] - roundOrder[b.round])
        .map((match) => ({
          ...match,
          username_player1:
            match.username_player1 ??
            (typeof match.player1 === 'number' ? playersById.get(match.player1) : null) ??
            t('game.winner.player1_label'),
          username_player2:
            match.username_player2 ??
            (typeof match.player2 === 'number' ? playersById.get(match.player2) : null) ??
            t('game.winner.player2_label'),
          username_winner:
            match.username_winner ??
            (typeof match.winner_id === 'number' ? playersById.get(match.winner_id) : null) ??
            t('game.tournament_results.unknown_winner'),
        }));

      setTournamentResults(results);
      setTournamentResultsError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('game.tournament_results.fetch_error');
      setTournamentResultsError(message);
      setTournamentResults([]);
    }
  }

  async function resolveTournamentNextStep() {
    if (!isTournamentMode || !tournamentId) return;

    setIsResolvingTournamentNextMatch(true);
    setTournamentResultsError(null);

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
    if (isTournamentMode) return;

    const targetPath =
      activeMode === 'remote'
        ? '/game/remote'
        : activeMode === 'ai'
          ? '/game/pong-ai'
          : '/game/local';

    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: true });
    }
  }, [activeMode, isTournamentMode, location.pathname, navigate]);

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

        {screen === 'tournament_results' && (
          <TournamentResultsScreen
            tournamentId={tournamentId ?? null}
            matches={tournamentResults}
            error={tournamentResultsError}
            onExit={handleExit}
          />
        )}
      </Background>
    </div>
  );
};
