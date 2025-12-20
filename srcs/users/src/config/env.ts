import { config } from 'dotenv'
import { bool, cleanEnv, num, str } from 'envalid'

config({ path: '../.env' })
config({ path: '../.env.um' })

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
  UM_SERVICE_PORT: num({ default: 3002 }),
  UM_SERVICE_NAME: str({ default: 'user-service' }),
  UM_DB_PATH: str({ default: './data/um.db' }),
  UM_DB_NAME: str({ default: 'um.db' }),
  UM_DB_URL: str({ default: 'file:./data/um.db' }),
  UM_REDIS_CHANNEL: str({default: 'user_management'}),
  REDIS_SERVICE_NAME: str({default: 'redis-broker'})
})
