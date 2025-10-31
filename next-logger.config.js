const pino = require("pino");

/**
 * Custom logger configuration for next-logger
 * Uses the same configuration as our logger utility
 */
const logger = (defaultConfig) => {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // JSON in production
    return pino({
      ...defaultConfig,
      level: process.env.LOG_LEVEL || "warn",
    });
  }

  // Pretty print in development
  return pino({
    ...defaultConfig,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    },
    level: process.env.LOG_LEVEL || "debug",
  });
};

module.exports = {
  logger,
};
