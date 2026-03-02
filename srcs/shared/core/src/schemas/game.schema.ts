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
  sessionId: number;
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
