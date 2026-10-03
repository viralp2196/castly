import pino, { type DestinationStream } from "pino";
import type { Config } from "./config";

/** Header paths that carry credentials; pino-http logs request/response headers, so these are censored. */
export const REDACTED_PATHS = [
  "req.headers.cookie",
  "req.headers.authorization",
  'res.headers["set-cookie"]',
  'res.headers["Set-Cookie"]',
];

export function createLogger(config: Pick<Config, "env">, destination?: DestinationStream) {
  return pino(
    {
      level: config.env === "production" ? "info" : "debug",
      redact: { paths: REDACTED_PATHS, censor: "[redacted]" },
    },
    destination ?? (config.env === "development" ? pino.destination(1) : undefined),
  );
}
