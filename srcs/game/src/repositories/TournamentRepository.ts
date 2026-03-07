// ============================================================================
// TournamentRepository — CRUD for tournaments, bracket logic, blockchain payload
// ============================================================================

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import {
  TournamentDTO,
  MatchToPlayDTO,
  AppError,
  ERR_DEFS,
  LOG_REASONS,
  ErrorDetail,
} from '@transcendence/core';

interface TournamentPlayerView {
  player_id: number;
  username: string | null;
  avatar: string | null;
  slot: number;
}

interface TournamentStatRow {
  player_id: number;
  username: string;
  tournaments_played: number;
  tournaments_won: number;
  tournaments_lost: number;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  points_scored: number;
  points_conceded: number;
  avg_points_scored: number;
  avg_points_conceded: number;
  tournamentsWinRate: number;
  matchesWinRate: number;
  last_match_at: number | null;
}

export class TournamentRepository {
  private db;
  private createTournamentStmt;
  private addPlayerTournamentStmt;
  private addPlayerPositionStmt;
  private listTournamentsStmt;
  private countPlayerTournamentStmt;
  private changeStatusStmt;
  private listPlayersStmt;
  private isPlayerInTournamentStmt;
  private getPlayersIdStmt;
  private createMatchStmt;
  private getMatchToPlayStmt;
  private countUnfinishedMatchesStmt;
  private getMatchByRoundStmt;
  private getTournamentStatsStmt;
  private getAllPlayersStatsStmt;
  private getBlockchainPlayersStmt;
  private getTournamentStateStmt;
  private getMatchByIdFullStmt;
  private getStatusStmt;

  constructor(db: Database.Database) {
    this.db = db;

    this.createTournamentStmt = db.prepare(`
      INSERT INTO tournament(creator_id, created_at) VALUES (?, ?)
    `);
    this.addPlayerTournamentStmt = db.prepare(`
      INSERT INTO tournament_player(player_id, tournament_id, slot) VALUES(?, ?, ?)
    `);
    this.addPlayerPositionStmt = db.prepare(`
      UPDATE tournament_player SET final_position = ? WHERE tournament_id = ? AND player_id = ?
    `);
    this.listTournamentsStmt = db.prepare(`
      SELECT t.id, t.status, COALESCE(p.username, 'unknown') as username, COUNT(tp.player_id) as player_count
      FROM tournament t
      LEFT JOIN tournament_player tp ON t.id = tp.tournament_id
      LEFT JOIN player p ON p.id = t.creator_id
      WHERE t.status IN ('PENDING', 'STARTED')
      GROUP BY t.id, t.status, p.username
    `);
    this.countPlayerTournamentStmt = db.prepare(`
      SELECT COUNT(*) as nbPlayer FROM tournament_player WHERE tournament_id = ?
    `);
    this.changeStatusStmt = db.prepare(`
      UPDATE tournament SET status = ? WHERE id = ?
    `);
    this.listPlayersStmt = db.prepare(`
      SELECT tp.player_id, p.username, p.avatar, tp.slot
      FROM tournament_player tp
      LEFT JOIN player p ON tp.player_id = p.id
      WHERE tournament_id = ?
      ORDER BY tp.slot ASC
    `);
    this.isPlayerInTournamentStmt = db.prepare(`
      SELECT * FROM tournament_player WHERE player_id = ? AND tournament_id = ?
    `);
    this.getPlayersIdStmt = db.prepare(`
      SELECT player_id FROM tournament_player WHERE tournament_id = ? ORDER BY slot ASC
    `);
    this.createMatchStmt = db.prepare(`
      INSERT INTO match(tournament_id, player1, player2, sessionId, round, created_at)
      VALUES(?,?,?,?,?,?)
    `);
    this.getMatchToPlayStmt = db.prepare(`
      SELECT sessionId, id, round, player1, player2
      FROM match
      WHERE tournament_id = ?
        AND (player1 = ? OR player2 = ?)
        AND player2 IS NOT NULL
        AND player1 IS NOT NULL
        AND sessionId IS NOT NULL
        AND winner_id IS NULL
    `);
    this.countUnfinishedMatchesStmt = db.prepare(`
      SELECT COUNT(*) AS count FROM match WHERE tournament_id = ? AND winner_id IS NULL
    `);
    this.getMatchByRoundStmt = db.prepare(`
      SELECT player1, player2, winner_id FROM match WHERE tournament_id = ? AND round = ?
    `);
    this.getTournamentStateStmt = db.prepare(`
      SELECT
        m.id, m.round, m.player1, m.player2,
        m.score_player1, m.score_player2, m.winner_id, m.sessionId,
        p1.username AS username_player1,
        p2.username AS username_player2,
        pw.username AS username_winner
      FROM match m
      LEFT JOIN player p1 ON p1.id = m.player1
      LEFT JOIN player p2 ON p2.id = m.player2
      LEFT JOIN player pw ON pw.id = m.winner_id
      WHERE m.tournament_id = ?
      ORDER BY m.created_at ASC
    `);
    this.getMatchByIdFullStmt = db.prepare(`
      SELECT
        m.id, m.tournament_id, m.round, m.player1, m.player2,
        m.sessionId, m.score_player1, m.score_player2, m.winner_id,
        p1.username AS username_player1,
        p2.username AS username_player2
      FROM match m
      LEFT JOIN player p1 ON p1.id = m.player1
      LEFT JOIN player p2 ON p2.id = m.player2
      WHERE m.id = ?
    `);
    this.getStatusStmt = db.prepare(`
      SELECT status FROM tournament WHERE id = ?
    `);
    this.getTournamentStatsStmt = db.prepare(`
      WITH base AS (
        SELECT
          p.id AS player_id,
          COALESCE(p.username, 'unknown') AS username,
          (
            SELECT COUNT(DISTINCT tp.tournament_id)
            FROM tournament_player tp
            WHERE tp.player_id = p.id
          ) AS tournaments_played,
          (
            SELECT COUNT(DISTINCT tp.tournament_id)
            FROM tournament_player tp
            WHERE tp.player_id = p.id AND tp.final_position = 1
          ) AS tournaments_won,
          (
            SELECT COUNT(DISTINCT tp.tournament_id)
            FROM tournament_player tp
            WHERE tp.player_id = p.id AND tp.final_position > 1
          ) AS tournaments_lost,
          (
            SELECT COUNT(*)
            FROM match m
            WHERE m.player1 = p.id OR m.player2 = p.id
          ) AS matches_played,
          (
            SELECT COUNT(*)
            FROM match m
            WHERE (m.player1 = p.id OR m.player2 = p.id) AND m.winner_id = p.id
          ) AS matches_won,
          (
            SELECT COUNT(*)
            FROM match m
            WHERE (m.player1 = p.id OR m.player2 = p.id)
              AND m.winner_id IS NOT NULL
              AND m.winner_id <> p.id
          ) AS matches_lost,
          (
            SELECT COALESCE(
              SUM(
                CASE
                  WHEN m.player1 = p.id THEN COALESCE(m.score_player1, 0)
                  WHEN m.player2 = p.id THEN COALESCE(m.score_player2, 0)
                  ELSE 0
                END
              ),
              0
            )
            FROM match m
            WHERE m.player1 = p.id OR m.player2 = p.id
          ) AS points_scored,
          (
            SELECT COALESCE(
              SUM(
                CASE
                  WHEN m.player1 = p.id THEN COALESCE(m.score_player2, 0)
                  WHEN m.player2 = p.id THEN COALESCE(m.score_player1, 0)
                  ELSE 0
                END
              ),
              0
            )
            FROM match m
            WHERE m.player1 = p.id OR m.player2 = p.id
          ) AS points_conceded,
          (
            SELECT MAX(m.created_at)
            FROM match m
            WHERE m.player1 = p.id OR m.player2 = p.id
          ) AS last_match_at
        FROM player p
        WHERE p.id = ?
      )
      SELECT
        player_id,
        username,
        tournaments_played,
        tournaments_won,
        tournaments_lost,
        matches_played,
        matches_won,
        matches_lost,
        points_scored,
        points_conceded,
        CASE
          WHEN matches_played = 0 THEN 0.0
          ELSE ROUND(points_scored * 1.0 / matches_played, 2)
        END AS avg_points_scored,
        CASE
          WHEN matches_played = 0 THEN 0.0
          ELSE ROUND(points_conceded * 1.0 / matches_played, 2)
        END AS avg_points_conceded,
        CASE
          WHEN tournaments_played = 0 THEN 0.0
          ELSE ROUND((tournaments_won * 100.0) / tournaments_played, 2)
        END AS tournamentsWinRate,
        CASE
          WHEN matches_played = 0 THEN 0.0
          ELSE ROUND((matches_won * 100.0) / matches_played, 2)
        END AS matchesWinRate,
        last_match_at
      FROM base
    `);
    this.getAllPlayersStatsStmt = db.prepare(`
      WITH base AS (
        SELECT
          p.id AS player_id,
          COALESCE(p.username, 'unknown') AS username,
          (
            SELECT COUNT(DISTINCT tp.tournament_id)
            FROM tournament_player tp
            WHERE tp.player_id = p.id
          ) AS tournaments_played,
          (
            SELECT COUNT(DISTINCT tp.tournament_id)
            FROM tournament_player tp
            WHERE tp.player_id = p.id AND tp.final_position = 1
          ) AS tournaments_won,
          (
            SELECT COUNT(DISTINCT tp.tournament_id)
            FROM tournament_player tp
            WHERE tp.player_id = p.id AND tp.final_position > 1
          ) AS tournaments_lost,
          (
            SELECT COUNT(*)
            FROM match m
            WHERE m.player1 = p.id OR m.player2 = p.id
          ) AS matches_played,
          (
            SELECT COUNT(*)
            FROM match m
            WHERE (m.player1 = p.id OR m.player2 = p.id) AND m.winner_id = p.id
          ) AS matches_won,
          (
            SELECT COUNT(*)
            FROM match m
            WHERE (m.player1 = p.id OR m.player2 = p.id)
              AND m.winner_id IS NOT NULL
              AND m.winner_id <> p.id
          ) AS matches_lost,
          (
            SELECT COALESCE(
              SUM(
                CASE
                  WHEN m.player1 = p.id THEN COALESCE(m.score_player1, 0)
                  WHEN m.player2 = p.id THEN COALESCE(m.score_player2, 0)
                  ELSE 0
                END
              ),
              0
            )
            FROM match m
            WHERE m.player1 = p.id OR m.player2 = p.id
          ) AS points_scored,
          (
            SELECT COALESCE(
              SUM(
                CASE
                  WHEN m.player1 = p.id THEN COALESCE(m.score_player2, 0)
                  WHEN m.player2 = p.id THEN COALESCE(m.score_player1, 0)
                  ELSE 0
                END
              ),
              0
            )
            FROM match m
            WHERE m.player1 = p.id OR m.player2 = p.id
          ) AS points_conceded,
          (
            SELECT MAX(m.created_at)
            FROM match m
            WHERE m.player1 = p.id OR m.player2 = p.id
          ) AS last_match_at
        FROM player p
        WHERE EXISTS (SELECT 1 FROM match m WHERE m.player1 = p.id OR m.player2 = p.id)
      )
      SELECT
        player_id,
        username,
        tournaments_played,
        tournaments_won,
        tournaments_lost,
        matches_played,
        matches_won,
        matches_lost,
        points_scored,
        points_conceded,
        CASE
          WHEN matches_played = 0 THEN 0.0
          ELSE ROUND(points_scored * 1.0 / matches_played, 2)
        END AS avg_points_scored,
        CASE
          WHEN matches_played = 0 THEN 0.0
          ELSE ROUND(points_conceded * 1.0 / matches_played, 2)
        END AS avg_points_conceded,
        CASE
          WHEN tournaments_played = 0 THEN 0.0
          ELSE ROUND((tournaments_won * 100.0) / tournaments_played, 2)
        END AS tournamentsWinRate,
        CASE
          WHEN matches_played = 0 THEN 0.0
          ELSE ROUND((matches_won * 100.0) / matches_played, 2)
        END AS matchesWinRate,
        last_match_at
      FROM base
      ORDER BY matchesWinRate DESC, matches_won DESC, points_scored DESC
    `);
    this.getBlockchainPlayersStmt = db.prepare(`
      SELECT tp.player_id, tp.final_position
      FROM tournament_player tp
      WHERE tp.tournament_id = ?
      ORDER BY tp.final_position ASC
    `);
  }
  createTournament(playerId: number): number {
    try {
      const result = this.createTournamentStmt.run(playerId, Date.now());
      const tournamentId = Number(result.lastInsertRowid);
      this.addPlayer(playerId, tournamentId, 1);
      return tournamentId;
    } catch (err: unknown) {
      throw new AppError(
        ERR_DEFS.DB_INSERT_ERROR,
        { details: [{ field: `createTournament ${playerId}` }] },
        err,
      );
    }
  }

  addPlayer(playerId: number, tournamentId: number, slot: number = 0): void {
    try {
      this.addPlayerTournamentStmt.run(playerId, tournamentId, slot);
    } catch (err: unknown) {
      throw new AppError(
        ERR_DEFS.DB_UPDATE_ERROR,
        { details: [{ field: `addPlayer ${playerId} ${tournamentId}` }] },
        err,
      );
    }
  }

  joinTournament(playerId: number, tournamentId: number): void {
    try {
      const transaction = this.db.transaction(() => {
        const result = this.countPlayerTournamentStmt.get(tournamentId) as { nbPlayer: number };
        const isAlreadyIn = this.isPlayerInTournamentStmt.get(playerId, tournamentId);
        if (isAlreadyIn) return;

        const nbPlayers = result.nbPlayer;
        if (nbPlayers >= 4) {
          const errorDetail: ErrorDetail = {
            field: `tournament full: ${tournamentId}`,
            message: 'Tournament is already full',
            reason: LOG_REASONS.TOURNAMENT.FULL,
          };
          throw new AppError(ERR_DEFS.DB_UPDATE_ERROR, { details: [errorDetail] });
        }

        this.addPlayer(playerId, tournamentId, nbPlayers + 1);

        if (nbPlayers === 3) {
          this.changeStatusStmt.run('STARTED', tournamentId);
          this.initializeMatches(tournamentId);
        }
      });
      transaction();
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        ERR_DEFS.DB_UPDATE_ERROR,
        { details: [{ field: `joinTournament: ${tournamentId}` }] },
        err,
      );
    }
  }

  private initializeMatches(tournamentId: number): void {
    const players = this.getPlayersIdStmt.all(tournamentId) as { player_id: number }[];
    if (players.length !== 4) {
      const errorDetail: ErrorDetail = {
        field: `Invalid player count: ${tournamentId}`,
        message: 'Tournament invalid player count',
        reason: LOG_REASONS.TOURNAMENT.COUNT,
      };
      throw new AppError(ERR_DEFS.DB_UPDATE_ERROR, { details: [errorDetail] });
    }
    const now = Date.now();
    this.createMatchStmt.run(
      tournamentId,
      players[0].player_id,
      players[1].player_id,
      randomUUID(),
      'SEMI_1',
      now,
    );
    this.createMatchStmt.run(
      tournamentId,
      players[2].player_id,
      players[3].player_id,
      randomUUID(),
      'SEMI_2',
      now,
    );
  }

  listTournaments(): TournamentDTO[] {
    try {
      return this.listTournamentsStmt.all() as TournamentDTO[];
    } catch (err: unknown) {
      throw new AppError(
        ERR_DEFS.DB_SELECT_ERROR,
        { details: [{ field: 'listTournaments' }] },
        err,
      );
    }
  }

  showTournament(tournamentId: number): TournamentPlayerView[] {
    try {
      return this.listPlayersStmt.all(tournamentId) as TournamentPlayerView[];
    } catch (err: unknown) {
      throw new AppError(
        ERR_DEFS.DB_SELECT_ERROR,
        { details: [{ field: `showTournament: ${tournamentId}` }] },
        err,
      );
    }
  }

  getMatchToPlay(tournamentId: number, userId: number): MatchToPlayDTO | null {
    try {
      const match = this.getMatchToPlayStmt.get(
        tournamentId,
        userId,
        userId,
      ) as MatchToPlayDTO | null;
      if (!match) {
        const errorDetail: ErrorDetail = {
          field: `No match to play for user ${userId} in tournament ${tournamentId}`,
          message: 'No match to play',
          reason: LOG_REASONS.TOURNAMENT.NO_MATCH_TO_PLAY,
        };
        throw new AppError(ERR_DEFS.DB_SELECT_ERROR, { details: [errorDetail] });
      }
      return match;
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        ERR_DEFS.DB_SELECT_ERROR,
        { details: [{ field: `getMatchToPlay tournamentId:${tournamentId} userId:${userId}` }] },
        err,
      );
    }
  }

  /**
   * Returns the full state of a tournament: status, players, and all matches with scores/usernames.
   * This is used by the frontend to reconstruct the entire bracket in one call.
   */
  getTournamentFullState(tournamentId: number): {
    status: 'PENDING' | 'STARTED' | 'FINISHED' | null;
    players: TournamentPlayerView[];
    matches: Array<{
      id: number;
      round: string;
      player1: number;
      player2: number;
      score_player1: number;
      score_player2: number;
      winner_id: number | null;
      sessionId: string | null;
      username_player1: string | null;
      username_player2: string | null;
      username_winner: string | null;
    }>;
  } {
    try {
      const statusRow = this.getStatusStmt.get(tournamentId) as { status: string } | undefined;
      if (!statusRow) {
        return { status: null, players: [], matches: [] };
      }
      const players = this.listPlayersStmt.all(tournamentId) as TournamentPlayerView[];
      const matches = this.getTournamentStateStmt.all(tournamentId) as Array<{
        id: number;
        round: string;
        player1: number;
        player2: number;
        score_player1: number;
        score_player2: number;
        winner_id: number | null;
        sessionId: string | null;
        username_player1: string | null;
        username_player2: string | null;
        username_winner: string | null;
      }>;
      return {
        status: statusRow.status as 'PENDING' | 'STARTED' | 'FINISHED',
        players,
        matches,
      };
    } catch (err: unknown) {
      throw new AppError(
        ERR_DEFS.DB_SELECT_ERROR,
        { details: [{ field: `getTournamentFullState ${tournamentId}` }] },
        err,
      );
    }
  }

  /**
   * Returns match info by match ID (used to resolve matchId -> sessionId for /game/:matchId).
   */
  getMatchById(matchId: number): {
    id: number;
    tournament_id: number | null;
    round: string | null;
    player1: number;
    player2: number;
    sessionId: string | null;
    score_player1: number;
    score_player2: number;
    winner_id: number | null;
    username_player1: string | null;
    username_player2: string | null;
  } | null {
    try {
      const row = this.getMatchByIdFullStmt.get(matchId) as any;
      return row || null;
    } catch (err: unknown) {
      throw new AppError(
        ERR_DEFS.DB_SELECT_ERROR,
        { details: [{ field: `getMatchById ${matchId}` }] },
        err,
      );
    }
  }

  isTournamentComplete(tournamentId: number): boolean {
    try {
      const result = this.countUnfinishedMatchesStmt.get(tournamentId) as { count: number };
      return result.count === 0;
    } catch (err: unknown) {
      throw new AppError(
        ERR_DEFS.DB_SELECT_ERROR,
        { details: [{ field: `isTournamentComplete ${tournamentId}` }] },
        err,
      );
    }
  }

  setTournamentFinished(tournamentId: number): void {
    try {
      this.db.transaction(() => {
        this.changeStatusStmt.run('FINISHED', tournamentId);

        const finalMatch = this.getMatchByRoundStmt.get(tournamentId, 'FINAL') as
          | {
              player1: number;
              player2: number;
              winner_id: number | null;
            }
          | undefined;
        const littleFinalMatch = this.getMatchByRoundStmt.get(tournamentId, 'LITTLE_FINAL') as
          | {
              player1: number;
              player2: number;
              winner_id: number | null;
            }
          | undefined;

        if (finalMatch?.winner_id != null) {
          const loser =
            finalMatch.player1 === finalMatch.winner_id ? finalMatch.player2 : finalMatch.player1;
          this.addPlayerPositionStmt.run(1, tournamentId, finalMatch.winner_id);
          this.addPlayerPositionStmt.run(2, tournamentId, loser);
        }
        if (littleFinalMatch?.winner_id != null) {
          const loser =
            littleFinalMatch.player1 === littleFinalMatch.winner_id
              ? littleFinalMatch.player2
              : littleFinalMatch.player1;
          this.addPlayerPositionStmt.run(3, tournamentId, littleFinalMatch.winner_id);
          this.addPlayerPositionStmt.run(4, tournamentId, loser);
        }
      })();
    } catch (err: unknown) {
      throw new AppError(
        ERR_DEFS.DB_UPDATE_ERROR,
        { details: [{ field: `setTournamentFinished ${tournamentId}` }] },
        err,
      );
    }
  }

  getTournamentStats(userId: number): TournamentStatRow[] {
    try {
      return this.getTournamentStatsStmt.all(userId) as TournamentStatRow[];
    } catch (err: unknown) {
      throw new AppError(
        ERR_DEFS.DB_SELECT_ERROR,
        { details: [{ field: 'getTournamentStats' }] },
        err,
      );
    }
  }

  /** Returns stats for ALL players who have played at least one match, sorted by win rate. */
  getAllPlayersStats(): TournamentStatRow[] {
    try {
      return this.getAllPlayersStatsStmt.all() as TournamentStatRow[];
    } catch (err: unknown) {
      throw new AppError(
        ERR_DEFS.DB_SELECT_ERROR,
        { details: [{ field: 'getAllPlayersStats' }] },
        err,
      );
    }
  }

  getTournamentResultForBlockchain(tournamentId: number): {
    tour_id: number;
    player1: number;
    player2: number;
    player3: number;
    player4: number;
  } | null {
    try {
      const rows = this.getBlockchainPlayersStmt.all(tournamentId) as Array<{
        player_id: number;
        final_position: number | null;
      }>;
      const byPosition: Record<number, number> = {};
      for (const row of rows) {
        if (row.final_position != null) {
          byPosition[row.final_position] = row.player_id;
        }
      }
      if (!byPosition[1] || !byPosition[2] || !byPosition[3] || !byPosition[4]) {
        return null;
      }
      return {
        tour_id: tournamentId,
        player1: byPosition[1],
        player2: byPosition[2],
        player3: byPosition[3],
        player4: byPosition[4],
      };
    } catch (err: unknown) {
      throw new AppError(
        ERR_DEFS.DB_SELECT_ERROR,
        { details: [{ field: `getTournamentResultForBlockchain ${tournamentId}` }] },
        err,
      );
    }
  }
}
