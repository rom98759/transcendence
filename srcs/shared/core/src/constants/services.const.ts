export const SERVICES = {
  GATEWAY: {
    NAME: 'api-gateway',
    PORT: 3000,
    BASE_PATH: '/',
  },
  PROXY: {
    NAME: 'nginx-proxy',
    BASE_PATH: '/',
  },
  AUTH: {
    NAME: 'auth',
    PORT: 3001,
    BASE_PATH: '/auth',
  },
  USERS: {
    NAME: 'users',
    PORT: 3002,
    BASE_PATH: '/users',
  },
  GAME: {
    NAME: 'game',
    PORT: 3004,
    BASE_PATH: '/game',
  },
  BLOCKCHAIN: {
    NAME: 'blockchain',
    PORT: 3005,
    BASE_PATH: '/blockchain',
  },
  REDIS: {
    NAME: 'redis',
    PORT: 6379,
    BASE_PATH: '/redis',
  },
} as const;
