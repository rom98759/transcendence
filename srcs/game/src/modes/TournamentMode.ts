// ============================================================================
// TournamentMode — Two players from a tournament bracket
// Validates authorized players from DB match before allowing join.
// Persists results + triggers bracket progression + blockchain publish.
// ============================================================================

import { WebSocket } from 'ws';
import { FastifyInstance } from 'fastify';
import { IGameMode, UserIdentity } from './IGameMode.js';
import { Session } from '../core/session/Session.js';
import { GameOverData, WS_CLOSE } from '../types/game.types.js';
import { createHumanPlayer } from '../core/player/PlayerFactory.js';
import type { MatchRepository } from '../repositories/MatchRepository.js';
import type { TournamentRepository } from '../repositories/TournamentRepository.js';

export class TournamentMode implements IGameMode {
  constructor(
    private matchRepo: MatchRepository,
    private tournamentRepo: TournamentRepository,
  ) {}

  canStart(session: Session): boolean {
    return session.connectedPlayerCount >= 2;
  }

  async onPlayerJoin(
    session: Session,
    ws: WebSocket,
    user: UserIdentity | null,
    app: FastifyInstance,
  ): Promise<boolean> {
    // Tournament requires authenticated user
    if (!user?.id) {
      app.log.warn({ sessionId: session.id }, 'Tournament WS: missing userId');
      ws.close(WS_CLOSE.PLAYER_QUIT, 'Missing user identity for tournament match');
      return false;
    }

    // Validate that user is an authorized player in this match
    const match = this.matchRepo.getMatchBySessionId(session.id);
    if (match && match.player1 !== user.id && match.player2 !== user.id) {
      app.log.warn(
        { sessionId: session.id, userId: user.id, expected: [match.player1, match.player2] },
        'Tournament WS: unauthorized player',
      );
      ws.close(WS_CLOSE.PLAYER_QUIT, 'You are not a player in this tournament match');
      return false;
    }

    // Prevent same user from connecting twice
    if (session.getPlayerByUserId(user.id)) {
      app.log.warn({ sessionId: session.id, userId: user.id }, 'Tournament WS: already connected');
      ws.close(WS_CLOSE.SESSION_FULL, 'You are already connected to this match');
      return false;
    }

    const role = session.getNextAvailableRole();
    if (!role) {
      ws.close(WS_CLOSE.SESSION_FULL, 'Session full');
      return false;
    }

    const player = createHumanPlayer(role, user.id, ws);
    session.setPlayer(role, player);

    ws.send(JSON.stringify({ type: 'connected', message: `Player ${role}` }));
    app.log.info(`[${session.id}] Tournament: Player ${role} (userId=${user.id}) connected`);

    // Auto-start when both tournament players are in
    if (this.canStart(session) && session.game.status === 'waiting') {
      session.game.start();
      app.log.info(`[${session.id}] Tournament: both players — game auto-started`);
    }

    return true;
  }

  async onPlayerDisconnect(session: Session, ws: WebSocket, app: FastifyInstance): Promise<void> {
    const player = session.removePlayerByWs(ws);
    app.log.info(`[${session.id}] Tournament: Player ${player?.role ?? '?'} disconnected`);

    // A disconnection mid-game must stop the engine so GameLoop can persist the
    // partial result and advance the bracket. Without this, the match is never
    // recorded and the tournament stalls.
    if (session.game.status === 'playing') {
      app.log.info(`[${session.id}] Tournament: player left mid-game — game stopped (forfeit)`);
      session.game.stop();
    }
  }

  async onGameOver(session: Session, result: GameOverData, app: FastifyInstance): Promise<void> {
    const tournamentId = session.tournamentId;
    if (tournamentId == null) {
      app.log.error({ event: 'tournament_persist_no_id', sessionId: session.id });
      return;
    }

    try {
      const match = this.matchRepo.getMatchBySessionId(session.id);
      if (!match) {
        app.log.error({ event: 'tournament_persist_no_match', sessionId: session.id });
        return;
      }

      // Map roles to DB players: A = left, B = right
      // Determine score mapping based on which DB player is assigned to role A
      const playerAUserId = session.getUserId('A');
      let scorePlayer1: number;
      let scorePlayer2: number;

      if (playerAUserId === match.player1) {
        scorePlayer1 = result.scores.left;
        scorePlayer2 = result.scores.right;
      } else {
        scorePlayer1 = result.scores.right;
        scorePlayer2 = result.scores.left;
      }

      const winnerId = scorePlayer1 > scorePlayer2 ? match.player1 : match.player2;

      // Persist match result + trigger bracket progression
      this.matchRepo.updateMatchResult(match.id, scorePlayer1, scorePlayer2, winnerId);

      app.log.info({
        event: 'tournament_match_persisted',
        matchId: match.id,
        scorePlayer1,
        scorePlayer2,
        winnerId,
      });

      // Check tournament completion
      const isComplete = this.tournamentRepo.isTournamentComplete(tournamentId);
      if (isComplete) {
        this.tournamentRepo.setTournamentFinished(tournamentId);
        app.log.info({ event: 'tournament_complete', tournamentId });

        // Publish to blockchain via Redis stream
        await this.publishToBlockchain(app, tournamentId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      app.log.error({ event: 'tournament_persist_error', sessionId: session.id, err: msg });
    }
  }

  private async publishToBlockchain(app: FastifyInstance, tournamentId: number): Promise<void> {
    try {
      const payload = this.tournamentRepo.getTournamentResultForBlockchain(tournamentId);
      if (!payload) {
        app.log.warn({ event: 'blockchain_publish_no_data', tournamentId });
        return;
      }
      if (!app.redis) {
        app.log.warn({ event: 'blockchain_publish_no_redis', tournamentId });
        return;
      }

      await app.redis.xadd('tournament.results', '*', 'data', JSON.stringify(payload));
      app.log.info({ event: 'blockchain_published', tournamentId, payload });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      app.log.error({ event: 'blockchain_publish_error', tournamentId, err: msg });
      // Non-blocking: blockchain failure should not break game flow
    }
  }
}
