import * as winston from "winston";
import stripAnsi from "strip-ansi";

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      const logEntry = `${timestamp} ${level}: ${stripAnsi(String(message ?? ""))}`;

      return logEntry;
    }),
  ),
  transports: [new winston.transports.Console()],
});

export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};