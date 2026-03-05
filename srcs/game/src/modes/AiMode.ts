// ============================================================================
// AiMode — Human (Player A) vs AI (Player B controlled via REST RL API)
// AI paddle movement comes from the pong-ai service calling REST endpoints.
// ============================================================================

import { WebSocket } from 'ws';
import { FastifyInstance } from 'fastify';
import { IGameMode, UserIdentity } from './IGameMode.js';
import { Session } from '../core/session/Session.js';
import { GameOverData, WS_CLOSE, AI_USER_ID } from '../types/game.types.js';
import { createHumanPlayer, createAiPlayer } from '../core/player/PlayerFactory.js';
import type { MatchRepository } from '../repositories/MatchRepository.js';

export class AiMode implements IGameMode {
  constructor(private matchRepo: MatchRepository) {}

  canStart(session: Session): boolean {
    // AI mode starts with 1 human player (AI is virtual)
    return session.connectedPlayerCount >= 1;
  }

  async onPlayerJoin(
    session: Session,
    ws: WebSocket,
    user: UserIdentity | null,
    app: FastifyInstance,
  ): Promise<boolean> {
    if (session.isFull()) {
      ws.close(WS_CLOSE.SESSION_FULL, 'Session full');
      return false;
    }

    const role = session.getNextAvailableRole();
    if (!role) {
      app.log.info(`[${session.id}] AI mode: session full, refused connection`);
      ws.close(WS_CLOSE.SESSION_FULL, 'Session full');
      return false;
    }

    // First player to join is always AI (B) and second player is human (A)
    if (role === 'B') {
      const aiPlayer = createAiPlayer('B', ws);
      session.setPlayer('B', aiPlayer);
      ws.send(JSON.stringify({ type: 'connected', message: 'Player B (AI)' }));
      app.log.info(`[${session.id}] AI mode — Player B connected (AI)`);
      return true;
    }

    const safeUserId = user?.id != null && Number.isFinite(user.id) ? user.id : null;
    const player = createHumanPlayer(role, safeUserId, ws);
    session.setPlayer(role, player);

    ws.send(JSON.stringify({ type: 'connected', message: `Player ${role}` }));
    app.log.info(`[${session.id}] Player ${role} connected (userId=${safeUserId})`);

    // Auto-start when AI is in (B) and human joins (A)
    if (this.canStart(session) && session.game.status === 'waiting') {
      session.game.start();
      app.log.info(`[${session.id}] AI mode: both players connected — game auto-started`);
    }

    return true;
  }

  async onPlayerDisconnect(session: Session, ws: WebSocket, app: FastifyInstance): Promise<void> {
    session.removePlayerByWs(ws);
    app.log.info(`[${session.id}] AI mode — human player disconnected`);

    // Stop whether 'waiting' or 'playing': without a human the session is meaningless.
    if (session.connectedPlayerCount === 0 && session.game.status !== 'finished') {
      session.game.stop();
      app.log.info(`[${session.id}] AI mode — session stopped (no human player)`);
    }
  }

  async onGameOver(session: Session, result: GameOverData, app: FastifyInstance): Promise<void> {
    const player1Id = session.getUserId('A');
    if (player1Id == null || !Number.isFinite(player1Id)) {
      app.log.warn({ event: 'ai_match_no_human_player', sessionId: session.id });
      return;
    }

    try {
      // AI matches stored as free matches, player2 = 0 (AI marker)
      const winnerId = result.winner === 'left' ? player1Id : AI_USER_ID;
      this.matchRepo.createFreeMatch(
        player1Id,
        AI_USER_ID,
        session.id,
        result.scores.left,
        result.scores.right,
        winnerId,
      );

      app.log.info({
        event: 'ai_match_persisted',
        sessionId: session.id,
        humanId: player1Id,
        scores: result.scores,
        winnerId,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      app.log.error({ event: 'ai_match_persist_error', sessionId: session.id, err: msg });
    }
  }
}
