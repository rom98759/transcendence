// Params for /row/:id
export const blockIdSchema = {
  type: 'object',
  properties: {
    tx_id: { type: 'number' },
  },
  required: ['tx_id'],
} as const

// Body for POST /
export const blockSchema = {
  type: 'object',
  properties: {
    tx_id: { type: "integer" },
    tx_hash: { type: "string" },
    date_confirmed: { type: "string" },
    tour_id: { type: "integer" , minimum: 1},
    player1_id: { type: "integer" , minimum: 1},
    player2_id: { type: "integer" , minimum: 1},
    player3_id: { type: "integer" , minimum: 1},
    player4_id: { type: "integer" , minimum: 1}
  },
  required: ["tx_id", "tour_id", "player1_id", "player2_id", "player3_id", "player4_id"],
  additionalProperties: false
} as const;

export interface BlockTournamentInput {
  tx_id: number;
  tx_hash?: string;
  date_confirmed?: string;
  tour_id: number;
  player1_id: number;
  player2_id: number;
  player3_id: number;
  player4_id: number;
}

export interface BlockTournamentStored extends BlockTournamentInput {
  tx_hash: string;
  date_confirmed: string;
}
