import { cleanEnv, bool, port, str } from 'envalid';

// console.log(process.env)
export const appenv = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'test', 'production', 'staging'],
    default: 'developement',
  }),
  LOG_ENABLED: bool({ default: true }),
  LOG_LEVEL: str({
    choices: ['debug', 'info', 'warn', 'error'],
    default: 'info',
  }),
  API_GATEWAY_PORT: port({ default: 3000 }),
});
