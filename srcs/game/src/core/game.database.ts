import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import {
  UserEvent,
  TournamentDTO,
  MatchToPlayDTO,
  ERR_DEFS,
  TournamentResultDTO,
} from '@transcendence/core';
import { AppError, ErrorDetail } from '@transcendence/core';
import { randomUUID } from 'crypto';
import { LOG_REASONS } from '@transcendence/core';
import { FastifyInstance } from 'fastify';

// DB path
const DEFAULT_DIR = path.join(process.cwd(), 'data');
const DB_PATH = env.GAME_DB_PATH || path.join(DEFAULT_DIR, 'game.db');

// Check dir
try {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
} catch (err: unknown) {
  throw new AppError(
    ERR_DEFS.SERVICE_GENERIC,
    { details: [{ field: `Failed to ensure DB directory` }] },
    err,
  );
}

export const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
console.log('Using SQLite file:', DB_PATH);

// Create table
try {
  db.exec(`
CREATE TABLE IF NOT EXISTS match(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER, -- NULL if free match
    player1 INTEGER NOT NULL,
    player2 INTEGER NOT NULL,
    sessionId TEXT,-- NULL if match not started, otherwise the sessionId of the game instance
    score_player1 INTEGER NOT NULL DEFAULT 0,
    score_player2 INTEGER NOT NULL DEFAULT 0,
    winner_id INTEGER, -- NULL if match not finished, otherwise the id of the winner
    round TEXT, --NULL | SEMI_1 | SEMI_2 | LITTLE_FINAL | FINAL
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tournament_id) REFERENCES tournament(id) ON DELETE CASCADE,
    FOREIGN KEY (player1) REFERENCES player(id) ON DELETE CASCADE,
    FOREIGN KEY (player2) REFERENCES player(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES player(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tournament(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | STARTED | FINISHED
    created_at INTEGER NOT NULL,
    FOREIGN KEY (creator_id) REFERENCES player(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tournament_player(
    tournament_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    final_position INTEGER, -- NULL | 1 | 2 | 3 | 4
    slot INTEGER, --1 | 2 | 3 | 4, corresponds to the slot of the creator in the tournament
    FOREIGN KEY (tournament_id) REFERENCES tournament(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES player(id) ON DELETE CASCADE,
    UNIQUE( tournament_id, slot ),
    PRIMARY KEY (tournament_id, player_id)
);

CREATE TABLE IF NOT EXISTS player (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    avatar TEXT,-- NULL if not synchronised with user service
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_match_tournament
ON match(tournament_id);

CREATE INDEX IF NOT EXISTS idx_tournament_player_tid
ON tournament_player(tournament_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_unique_round
ON match(tournament_id, round);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_player_limit
ON tournament_player(tournament_id, player_id);
`);
} catch (err: unknown) {
  throw new AppError(
    ERR_DEFS.SERVICE_GENERIC,
    { details: [{ field: `Failed to initialize DB schema` }] },
    err,
  );
}

const createTournamentStmt = db.prepare(`
INSERT INTO tournament(creator_id, created_at)
VALUES (?,?)
`);

const addPlayerTournamentStmt = db.prepare(`
INSERT INTO tournament_player(player_id, tournament_id, slot)
VALUES(?, ?, ?)
`);

const addPlayerPositionTournamentStmt = db.prepare(`
UPDATE tournament_player
SET
  final_position = ?
WHERE tournament_id = ? and player_id = ?
  `);
//COALESCE avoid null if username not synchronised
const listTournamentsStmt = db.prepare(`
SELECT
  t.id,
  t.status,
  COALESCE(p.username, 'unknown') as username,
  COUNT(tp.player_id) as player_count
FROM tournament t
LEFT JOIN tournament_player tp
  ON t.id = tp.tournament_id
LEFT JOIN player p
  ON p.id = t.creator_id
WHERE t.status IN ('PENDING', 'STARTED')
GROUP BY t.id, t.status, p.username;
`);

const countPlayerTournamentStmt = db.prepare(`
SELECT COUNT(*) as nbPlayer
FROM tournament_player
WHERE tournament_id = ?;
`);

const upsertUserStmt = db.prepare(`
INSERT INTO player (id, username, avatar, updated_at)
VALUES (?, ?, ?, ?)
ON CONFLICT(id)
DO UPDATE SET
  username = excluded.username,
  avatar = excluded.avatar,
  updated_at = excluded.updated_at
`);

const deleteUserStmt = db.prepare(`
DELETE FROM player WHERE id = ?
`);

const changeStatusTournamentStmt = db.prepare(`
UPDATE tournament
SET status = ?
WHERE id = ?
`);

const listPlayersTournamentStmt = db.prepare(`
SELECT tp.player_id, p.username, p.avatar, tp.slot
FROM tournament_player tp
LEFT JOIN player p ON tp.player_id = p.id
WHERE tournament_id = ?
ORDER BY tp.slot ASC
`);

const isPlayerInTournamentStmt = db.prepare(`
SELECT *
FROM tournament_player
WHERE player_id = ? and tournament_id  = ?
`);

const getUserStmt = db.prepare(`
SELECT *
FROM player
WHERE id = ?`);

const getPalyerStatsStmt = db.prepare(`
SELECT *
FROM match
WHERE player1 = ? OR player2 = ?`);

export function createTournament(player_id: number): number {
  try {
    const idtournament = createTournamentStmt.run(player_id, Date.now());
    addPlayerTournament(player_id, Number(idtournament.lastInsertRowid), 1);
    return Number(idtournament.lastInsertRowid);
  } catch (err: unknown) {
    throw new AppError(
      ERR_DEFS.DB_INSERT_ERROR,
      { details: [{ field: `createTournament ${player_id}` }] },
      err,
    );
  }
}

export function addPlayerTournament(player: number, tournament_id: number, slot: number = 0) {
  try {
    addPlayerTournamentStmt.run(player, tournament_id, slot);
  } catch (err: unknown) {
    throw new AppError(
      ERR_DEFS.DB_UPDATE_ERROR,
      { details: [{ field: `addPlayerTournament ${player} ${tournament_id}` }] },
      err,
    );
  }
}

export function addPlayerPositionTournament(player: number, position: number, tournament: number) {
  try {
    addPlayerPositionTournamentStmt.run(position, tournament, player);
  } catch (err: unknown) {
    throw new AppError(
      ERR_DEFS.DB_UPDATE_ERROR,
      { details: [{ field: `addPlayerPositionTournament ${player} ${position} ${tournament}` }] },
      err,
    );
  }
}

export async function upsertUser(user: UserEvent) {
  try {
    upsertUserStmt.run(user.id, user.username, user.avatar, user.timestamp);
  } catch (err: unknown) {
    throw new AppError(
      ERR_DEFS.DB_UPDATE_ERROR,
      { details: [{ field: `upsertUser ${user.id}` }] },
      err,
    );
  }
}

export async function deleteUser(id: number) {
  try {
    deleteUserStmt.run(id);
  } catch (err: unknown) {
    throw new AppError(ERR_DEFS.DB_DELETE_ERROR, { details: [{ field: `deleteUser ${id}` }] }, err);
  }
}

export function listTournaments(): TournamentDTO[] {
  try {
    const rows = listTournamentsStmt.all() as TournamentDTO[];
    return rows;
  } catch (err: unknown) {
    throw new AppError(ERR_DEFS.DB_SELECT_ERROR, { details: [{ field: `listTournaments` }] }, err);
  }
}
/* ===========================
 * Tournament management
 * joinTournament: add a player to a tournament if not full, if full return an error,
 * if the player is already in the tournament do nothing
 * if the tournament reach 4 players, change status to STARTED and initialize matchs
 * create semi final match with player1 vs player2 and player3 vs player4
 * with sessionId and round SEMI_1 and SEMI_2
 * =========================== */
export function joinTournament(player_id: number, tournament_id: number) {
  try {
    //db transaction to avoid race condition when multiple players try to join the same tournament
    const transaction = db.transaction(() => {
      const result = countPlayerTournamentStmt.get(tournament_id) as { nbPlayer: number };
      const isAlreadyInGame = isPlayerInTournamentStmt.get(player_id, tournament_id);
      if (isAlreadyInGame) return;
      const nbPlayers = result['nbPlayer'];
      if (nbPlayers >= 4) {
        const errorDetail: ErrorDetail = {
          field: `tournament full: ${tournament_id}`,
          message: 'Tournament is already full',
          reason: LOG_REASONS.TOURNAMENT.FULL,
        };
        throw new AppError(ERR_DEFS.DB_UPDATE_ERROR, { details: [errorDetail] });
      }
      // add player to tournament with the slot index +1 of the current number of players in the tournament
      addPlayerTournament(player_id, tournament_id, nbPlayers + 1);
      if (nbPlayers === 3) {
        changeStatusTournamentStmt.run('STARTED', tournament_id);
        initializeTournamentMatchs(tournament_id);
      }
    });
    transaction();
  } catch (err: unknown) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      ERR_DEFS.DB_UPDATE_ERROR,
      { details: [{ field: `joinTournament: ${tournament_id}` }] },
      err,
    );
  }
}

const createMatchStmt = db.prepare(`
INSERT INTO match(tournament_id, player1, player2, sessionId, round, created_at)
VALUES(?,?,?,?,?,?)
`);

const getPlayersIdTournamentStmt = db.prepare(`
SELECT player_id
FROM tournament_player tp
WHERE tournament_id = ?
`);

/* when 4 slots are fulled, create 2 semi final matchs with
 * the player in slot 1 vs slot 2 and slot 3 vs slot 4
 * and assign them a sessionId and a round SEMI_1 and SEMI_2
 */
function initializeTournamentMatchs(tournament_id: number) {
  const players = getPlayersIdTournamentStmt.all(tournament_id) as { player_id: number }[];
  if (players.length != 4) {
    const errorDetail: ErrorDetail = {
      field: `Invalid player count: ${tournament_id}`,
      message: 'Tournament invalid player count',
      reason: LOG_REASONS.TOURNAMENT.COUNT,
    };
    throw new AppError(ERR_DEFS.DB_UPDATE_ERROR, { details: [errorDetail] });
  }
  const date = Date.now();
  const session1 = randomUUID();
  const session2 = randomUUID();
  createMatchStmt.run(
    tournament_id,
    players[0].player_id,
    players[1].player_id,
    session1,
    'SEMI_1',
    date,
  );
  createMatchStmt.run(
    tournament_id,
    players[2].player_id,
    players[3].player_id,
    session2,
    'SEMI_2',
    date,
  );
}

export function showTournament(tournament_id: number) {
  try {
    const result = listPlayersTournamentStmt.all(tournament_id);
    return result;
  } catch (err: unknown) {
    throw new AppError(
      ERR_DEFS.DB_SELECT_ERROR,
      { details: [{ field: `showTournament: ${tournament_id}` }] },
      err,
    );
  }
}

export function getUser(id: number) {
  try {
    const result = getUserStmt.get(id);
    if (!result) {
      throw new AppError(ERR_DEFS.USER_NOTFOUND_ERRORS, { userId: id });
    }
    return result;
  } catch (err: unknown) {
    if (err instanceof AppError) throw err;
    throw new AppError(ERR_DEFS.DB_SELECT_ERROR, { details: [{ field: `getUser ${id}` }] }, err);
  }
}

export function getPlayerStats(player_id: number) {
  try {
    const result = getPalyerStatsStmt.all(player_id);
    return result;
  } catch (err: unknown) {
    throw new AppError(
      ERR_DEFS.DB_SELECT_ERROR,
      { details: [{ field: `getPlayerStats ${player_id}` }] },
      err,
    );
  }
}

// const getMatchSmt = db.prepare(`
// SELECT sessionId , round, player1, player2, id
// FROM match
// WHERE tournament_id = ?
// `);

// const createPlayer1Match = db.prepare(`
// INSERT INTO match(tournament_id, player1, round, sessionId, created_at)
// VALUES (?,?,?,?,?)
// `);
// const createPlayer2Match = db.prepare(`
// UPDATE match
// SET player2 = ?
// WHERE id = ?
// `);

const getMatchToPlayStmt = db.prepare(`
SELECT sessionId , round, player1, player2
FROM match
WHERE tournament_id = ?
  AND (player1 = ? OR player2 = ?)
  AND player2 IS NOT NULL
  AND player1 IS NOT NULL
  AND sessionId IS NOT NULL
  AND winner_id IS NULL
`);

/* ===========================
 * Tournament page mappers
 * =========================== */
/* return the match to play for a player in a tournament, if no match to play return null*/
export function getMatchToPlay(tournament_id: number, userId: number): MatchToPlayDTO | null {
  try {
    const match = getMatchToPlayStmt.get(tournament_id, userId, userId) as MatchToPlayDTO | null;
    if (!match) {
      const errorDetail: ErrorDetail = {
        field: `No match to play for user ${userId} in tournament ${tournament_id}`,
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
      { details: [{ field: `getMatchToPlay tournamentId:${tournament_id} userId:${userId}` }] },
      err,
    );
  }
}

const getMatchByIdStmt = db.prepare(`
  SELECT tournament_id, player1, player2, round, winner_id
  FROM match
  WHERE id = ?`);

const countFinishedSemisStmt = db.prepare<[number], CountResult>(`
SELECT COUNT(*) AS count
FROM match
WHERE tournament_id = ?
  AND round IN ('SEMI_1', 'SEMI_2')
  AND winner_id IS NOT NULL;
`);

const getMatchByRound = db.prepare<[number, string], MathcRoundResult>(`
SELECT player1, player2, winner_id
FROM match
WHERE tournament_id = ?
  AND round = ?;
`);

/* when a match is finished this function  to store the score and winner */
export function updateMatchResult(
  matchId: number,
  scorePlayer1: number,
  scorePlayer2: number,
  winnerId: number,
) {
  const stmt = db.prepare(`
    UPDATE match
    SET score_player1 = ?, score_player2 = ?, winner_id = ?
    WHERE id = ?`);
  stmt.run(scorePlayer1, scorePlayer2, winnerId, matchId);
  onMatchFinished(matchId);
}

/* when a match is finished, check if it's a semi final,
 * if yes check if both semi final are finished,
 * if yes create the final and little final matchs
 */
function onMatchFinished(matchId: number) {
  db.transaction(() => {
    const match = getMatchByIdStmt.get(matchId) as {
      tournament_id: number;
      player1: number;
      round: string;
      winner_id: number;
    };
    if (!match) throw new Error('Match not found');
    if (match.round !== 'SEMI_1' && match.round !== 'SEMI_2') return;
    const semisFinished = countFinishedSemisStmt.get(match.tournament_id)!.count;
    if (semisFinished !== 2) return;

    // Récupérer gagnants et perdants
    const semi1 = getMatchByRound.get(match.tournament_id, 'SEMI_1');
    const semi2 = getMatchByRound.get(match.tournament_id, 'SEMI_2');

    const winner1 = semi1?.winner_id;
    const winner2 = semi2?.winner_id;

    const loser1 = semi1?.player1 === winner1 ? semi1?.player2 : semi1?.player1;
    const loser2 = semi2?.player1 === winner2 ? semi2?.player2 : semi2?.player1;

    const now = Date.now();

    createMatchStmt.run(match.tournament_id, winner1, winner2, randomUUID(), 'FINAL', now);
    createMatchStmt.run(match.tournament_id, loser1, loser2, randomUUID(), 'LITTLE_FINAL', now);
  })();
}

// ---- STATS ----
const getTournamentStatsStmt = db.prepare(`
SELECT
  p.id                                                                        AS player_id,
  COALESCE(p.username, 'unknown')                                             AS username,
  COUNT(DISTINCT tp.tournament_id)                                            AS tournaments_played,
  COUNT(DISTINCT CASE WHEN tp.final_position = 1 THEN tp.tournament_id END)  AS tournaments_won,
  COUNT(DISTINCT m.id)                                                        AS matches_played,
  COUNT(DISTINCT CASE WHEN m.winner_id = p.id THEN m.id END)                 AS matches_won
FROM player p
LEFT JOIN tournament_player tp
  ON tp.player_id = p.id
LEFT JOIN match m
  ON m.tournament_id IS NOT NULL
 AND (m.player1 = p.id OR m.player2 = p.id)
GROUP BY p.id, p.username
ORDER BY tournaments_won DESC, matches_won DESC, tournaments_played DESC;
`);

export function getTournamentStats() {
  try {
    return getTournamentStatsStmt.all();
  } catch (err: unknown) {
    throw new AppError(
      ERR_DEFS.DB_SELECT_ERROR,
      { details: [{ field: 'getTournamentStats' }] },
      err,
    );
  }
}

// ---- HISTORY ----
const getMatchHistoryStmt = db.prepare(`
SELECT
  m.id,
  m.tournament_id,
  m.round,
  m.score_player1,
  m.score_player2,
  m.winner_id,
  m.created_at,
  p1.username  AS username_player1,
  p2.username  AS username_player2,
  pw.username  AS username_winner
FROM match m
LEFT JOIN player p1 ON p1.id = m.player1
LEFT JOIN player p2 ON p2.id = m.player2
LEFT JOIN player pw ON pw.id = m.winner_id
ORDER BY m.created_at DESC
LIMIT 100;
`);

export function getMatchHistory() {
  try {
    return getMatchHistoryStmt.all();
  } catch (err: unknown) {
    throw new AppError(ERR_DEFS.DB_SELECT_ERROR, { details: [{ field: 'getMatchHistory' }] }, err);
  }
}

// ============================================================================
// SESSION → MATCH LOOKUP (used at game finish to persist results)
// ============================================================================

const getMatchBySessionIdStmt = db.prepare(`
SELECT id, tournament_id, player1, player2, round, winner_id
FROM match
WHERE sessionId = ?
`);

/**
 * Get match row from DB given the in-memory sessionId.
 * Returns null if this sessionId doesn't correspond to a DB match (free game).
 */
export function getMatchBySessionId(
  sessionId: string,
): {
  id: number;
  tournament_id: number | null;
  player1: number;
  player2: number;
  round: string | null;
  winner_id: number | null;
} | null {
  try {
    const row = getMatchBySessionIdStmt.get(sessionId) as any;
    return row || null;
  } catch (err: unknown) {
    throw new AppError(
      ERR_DEFS.DB_SELECT_ERROR,
      { details: [{ field: `getMatchBySessionId ${sessionId}` }] },
      err,
    );
  }
}

// ============================================================================
// TOURNAMENT COMPLETION CHECK
// ============================================================================

const countUnfinishedMatchesStmt = db.prepare(`
SELECT COUNT(*) AS count
FROM match
WHERE tournament_id = ?
  AND winner_id IS NULL
`);

/**
 * Returns true if ALL matches in a tournament have a winner (semis + final + little final).
 */
export function isTournamentComplete(tournamentId: number): boolean {
  try {
    const result = countUnfinishedMatchesStmt.get(tournamentId) as { count: number };
    return result.count === 0;
  } catch (err: unknown) {
    throw new AppError(
      ERR_DEFS.DB_SELECT_ERROR,
      { details: [{ field: `isTournamentComplete ${tournamentId}` }] },
      err,
    );
  }
}

/**
 * Mark tournament as FINISHED and set final_position for all players.
 * Positions: 1st (FINAL winner), 2nd (FINAL loser), 3rd (LITTLE_FINAL winner), 4th (LITTLE_FINAL loser).
 */
export function setTournamentFinished(tournamentId: number): void {
  try {
    db.transaction(() => {
      changeStatusTournamentStmt.run('FINISHED', tournamentId);

      const finalMatch = getMatchByRound.get(tournamentId, 'FINAL');
      const littleFinalMatch = getMatchByRound.get(tournamentId, 'LITTLE_FINAL');

      if (finalMatch && finalMatch.winner_id != null) {
        const finalLoser =
          finalMatch.player1 === finalMatch.winner_id ? finalMatch.player2 : finalMatch.player1;
        addPlayerPositionTournamentStmt.run(1, tournamentId, finalMatch.winner_id);
        addPlayerPositionTournamentStmt.run(2, tournamentId, finalLoser);
      }
      if (littleFinalMatch && littleFinalMatch.winner_id != null) {
        const littleFinalLoser =
          littleFinalMatch.player1 === littleFinalMatch.winner_id
            ? littleFinalMatch.player2
            : littleFinalMatch.player1;
        addPlayerPositionTournamentStmt.run(3, tournamentId, littleFinalMatch.winner_id);
        addPlayerPositionTournamentStmt.run(4, tournamentId, littleFinalLoser);
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

// ============================================================================
// BLOCKCHAIN PAYLOAD BUILDER
// ============================================================================

const getTournamentPlayersForBlockchainStmt = db.prepare(`
SELECT tp.player_id, tp.final_position
FROM tournament_player tp
WHERE tp.tournament_id = ?
ORDER BY tp.final_position ASC
`);

/**
 * Build the payload expected by the blockchain consumer (BlockTournamentInput).
 * player1 = 1st place, player2 = 2nd, player3 = 3rd, player4 = 4th.
 * Returns null if positions are not yet assigned.
 */
export function getTournamentResultForBlockchain(
  tournamentId: number,
): { tour_id: number; player1: number; player2: number; player3: number; player4: number } | null {
  try {
    const rows = getTournamentPlayersForBlockchainStmt.all(tournamentId) as Array<{
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
      return null; // Positions not fully assigned yet
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
