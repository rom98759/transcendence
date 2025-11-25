import { config } from 'dotenv';
import { bool, cleanEnv, num, str } from "envalid";

config({path: "../.env"});

console.log(process.env);
export const appenv = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production', 'staging'] }),
  LOG_ENABLED: bool( {default: true}),
  LOG_LEVEL: str({choices: ['debug', 'info', 'warn', 'error'], default: 'info'}),
  PORT: num( {default: 3003} ),
  UM_DB_PATH: str({default: "./data/um"}),
  UM_DB_NAME: str({default: "um.db"}),
  UM_DB_URL: str({default: "file:./data/um.db"})
});