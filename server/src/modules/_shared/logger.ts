/** The slice of a pino logger services need for best-effort warnings (routes pass `req.log`). */
export interface WarnLogger {
  warn(obj: unknown, msg?: string): void;
}
