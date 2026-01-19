import { bool, cleanEnv, port, str } from 'envalid';

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'test', 'production', 'staging'],
    default: 'development',
  }),
  LOG_ENABLED: bool({ default: true }),
  LOG_LEVEL: str({
    choices: ['debug', 'info', 'warn', 'error'],
    default: 'info',
  }),
  BK_SERVICE_PORT: port({ default: 3005 }),
  BK_SERVICE_NAME: str({ default: 'blockchain-service' }),
  BLOCK_DB_PATH: str({ default: './data/blockchain.db' }),
  AVALANCHE_RPC_URL: str({ default: 'http://localhost:8545' }),
  GAME_STORAGE_ADDRESS: str({ default: '0x...' }),
  BLOCKCHAIN_PRIVATE_KEY: str({ default: '0x...' }),
  BLOCKCHAIN_READY: bool({ default: false }),
  REDIS_SERVICE_NAME: str({ default: 'redis-broker' }),
  REDIS_URL: str({
    choices: ['redis://127.0.0.1:6379', 'redis://redis-broker:6379'],
    default: '',
  }),
});
