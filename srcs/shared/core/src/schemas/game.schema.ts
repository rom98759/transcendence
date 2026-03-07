/* ===========================
 * Tournaments list DB
 * =========================== */
export interface TournamentDTO {
  id: number;
  username: string;
  status: 'PENDING' | 'STARTED' | 'FINISHED';
  player_count: number;
}

export interface PlayerDTO {
  player_id: number;
  username: string;
  avatar: string | null;
  slot: 1 | 2 | 3 | 4;
}
export interface MatchToPlayDTO {
  sessionId: string;
  id: number;
  round: string;
  player1: number;
  player2: number;
}

export interface TournamentResultDTO {
  tour_id: number;
  player1: number;
  player2: number;
  player3: number;
  player4: number;
}

/* ===========================
 * Tournament full state (bracket reconstruction)
 * =========================== */
export interface TournamentMatchDTO {
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
}

export interface TournamentFullStateDTO {
  status: 'PENDING' | 'STARTED' | 'FINISHED';
  players: PlayerDTO[];
  matches: TournamentMatchDTO[];
}

/* ===========================
 * Match session resolution (matchId -> sessionId)
 * =========================== */
export interface MatchSessionDTO {
  matchId: number;
  sessionId: string | null;
  tournamentId: number | null;
  round: string | null;
  player1: number;
  player2: number;
  username_player1: string | null;
  username_player2: string | null;
  score_player1: number;
  score_player2: number;
  winner_id: number | null;
  finished: boolean;
}
