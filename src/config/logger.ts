import pino from "pino";

/**
 * Structured logger. In production it emits JSON; in development it is pretty.
 * Sensitive fields must never be passed as the first argument.
 */
const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino/file",
          options: { destination: 1 },
        },
  base: { service: "healthai" },
  redact: [
    "req.headers.authorization",
    "password",
    "passwordHash",
    "twoFASecret",
    "token",
    "refreshToken",
  ],
});

export type Logger = typeof logger;
export default logger;
