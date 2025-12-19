import pino from "pino";
import { LogContext } from "../types/logger.js";
import { loggerConfig } from "../config/logger.config.js";

export const logger = pino(loggerConfig) as pino.Logger<never> & {
  debug: (obj: LogContext, msg?: string) => void;
  info: (obj: LogContext, msg?: string) => void;
  warn: (obj: LogContext, msg?: string) => void;
  error: (obj: LogContext, msg?: string) => void;
};
