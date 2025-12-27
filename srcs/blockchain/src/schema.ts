// Params for /row/:id
export const rowIdSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
  },
  required: ['id'],
} as const

// Body for POST /
export const bodySchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    first_name: { type: 'string' },
    last_name: { type: 'string' },
  },
  required: ['id', 'first_name', 'last_name'],
} as const
