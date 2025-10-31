import pino, { type Logger } from "pino";

// Create logger instance based on environment
// Based on: https://blog.arcjet.com/structured-logging-in-json-for-next-js/
export const logger: Logger =
  process.env["NODE_ENV"] === "production"
    ? // JSON in production
      pino({
        level: process.env.LOG_LEVEL || "warn",
      })
    : // Pretty print in development
      pino({
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        },
        level: process.env.LOG_LEVEL || "debug",
      });

// Export convenience methods
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  fatal: logger.fatal.bind(logger),
};
