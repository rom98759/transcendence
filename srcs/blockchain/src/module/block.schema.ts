// Params for /row/:id
export const blockIdSchema = {
  type: 'object',
  properties: {
    tour_id: { type: 'number' },
  },
  required: ['tour_id'],
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
