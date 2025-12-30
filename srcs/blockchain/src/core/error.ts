export class RecordNotFoundError extends Error {}

export const errorEventMap: Record<string, string> = {
  TOURNAMENT_EXISTS: 'snapshot_register_error',
  BD_INSERT_TOURNAMENT_ERR: 'snapshot_register_error',
  BLOCKCHAIN_INSERT_TOURNAMENT_ERR: 'blockchain_register_error',
  BLOCKCHAIN_NO_SMART_CONTRACT_ERR: 'blockchain_dont_exist_error',
};

