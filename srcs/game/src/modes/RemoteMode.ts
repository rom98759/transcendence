// ============================================================================
// RemoteMode — Two remote players, each controlling one paddle via WebSocket
// Auto-starts when 2nd player connects.
// ============================================================================

import { WebSocket } from 'ws';
import { FastifyInstance } from 'fastify';
import { IGameMode, UserIdentity } from './IGameMode.js';
import { Session } from '../core/session/Session.js';
import { GameOverData, WS_CLOSE } from '../types/game.types.js';
import { createHumanPlayer } from '../core/player/PlayerFactory.js';
import type { MatchRepository } from '../repositories/MatchRepository.js';

export class RemoteMode implements IGameMode {
  constructor(private matchRepo: MatchRepository) {}

  canStart(session: Session): boolean {
    return session.connectedPlayerCount >= 2;
  }

  async onPlayerJoin(
    session: Session,
    ws: WebSocket,
    user: UserIdentity | null,
    app: FastifyInstance,
  ): Promise<boolean> {
    const role = session.getNextAvailableRole();
    if (!role) {
      app.log.info(`[${session.id}] Remote: session full, refused connection`);
      ws.close(WS_CLOSE.SESSION_FULL, 'Session full');
      return false;
    }

    const safeUserId = user?.id != null && Number.isFinite(user.id) ? user.id : null;
    const player = createHumanPlayer(role, safeUserId, ws);
    session.setPlayer(role, player);

    ws.send(JSON.stringify({ type: 'connected', message: `Player ${role}` }));
    app.log.info(`[${session.id}] Player ${role} connected (userId=${safeUserId})`);

    // Auto-start when both players are in
    if (this.canStart(session) && session.game.status === 'waiting') {
      session.game.start();
      app.log.info(`[${session.id}] Remote: both players connected — game auto-started`);
    }

    return true;
  }

  async onPlayerDisconnect(session: Session, ws: WebSocket, app: FastifyInstance): Promise<void> {
    const player = session.removePlayerByWs(ws);
    app.log.info(`[${session.id}] Remote: Player ${player?.role ?? '?'} disconnected`);

    // A disconnection during 'playing' ends the game immediately.
    // Stopping triggers GameLoop's finished branch → onGameOver → persist path.
    if (session.game.status === 'playing') {
      app.log.info(`[${session.id}] Remote: player left mid-game — game stopped (forfeit)`);
      session.game.stop();
      return;
    }

    if (session.connectedPlayerCount === 0 && session.game.status === 'waiting') {
      session.game.stop();
      app.log.info(`[${session.id}] Remote: no players left, session stopped`);
    }
  }

  async onGameOver(session: Session, result: GameOverData, app: FastifyInstance): Promise<void> {
    const player1Id = session.getUserId('A');
    const player2Id = session.getUserId('B');

    if (
      player1Id == null ||
      !Number.isFinite(player1Id) ||
      player2Id == null ||
      !Number.isFinite(player2Id)
    ) {
      app.log.warn({
        event: 'free_match_missing_players',
        sessionId: session.id,
        playerA: player1Id,
        playerB: player2Id,
      });
      return;
    }

    try {
      const winnerId = result.winner === 'left' ? player1Id : player2Id;
      this.matchRepo.createFreeMatch(
        player1Id,
        player2Id,
        session.id,
        result.scores.left,
        result.scores.right,
        winnerId,
      );

      app.log.info({
        event: 'free_match_persisted',
        sessionId: session.id,
        player1Id,
        player2Id,
        scores: result.scores,
        winnerId,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      app.log.error({ event: 'free_match_persist_error', sessionId: session.id, err: msg });
    }
  }
}
