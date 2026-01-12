export interface AppLogger {
  info(msg: unknown): void;
  warn(msg: unknown): void;
  error(msg: unknown): void;
  debug(msg: unknown): void;
}
