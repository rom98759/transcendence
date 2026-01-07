// Params for /row/:id
export const blockIdSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
  },
  required: ['id'],
} as const;

// Body for POST /
export const blockSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    tx_hash: { type: 'string' },
    snap_hash: { type: 'string' },
    block_timestamp: { type: 'integer' },
    tour_id: { type: 'integer', minimum: 1 },
    player1: { type: 'integer', minimum: 1 },
    player2: { type: 'integer', minimum: 1 },
    player3: { type: 'integer', minimum: 1 },
    player4: { type: 'integer', minimum: 1 },
  },
  required: ['tour_id', 'player1', 'player2', 'player3', 'player4'],
  additionalProperties: false,
} as const;

// export interface BlockTournamentInput {
//   id: number;
//   tx_hash?: string;
//   snap_hash?: string;
//   block_timestamp?: number;
//   tour_id: number;
//   player1_id: number;
//   player2_id: number;
//   player3_id: number;
//   player4_id: number;
// }
//
// export interface BlockTournamentStored extends BlockTournamentInput {
//   tx_hash: string;
//   snap_hash: string;
//   block_timestamp: number;
// }
