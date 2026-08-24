import winston from "winston";

const { combine, timestamp, printf, colorize } = winston.format;

// Custom log format: [timestamp] LEVEL: message
const customFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    colorize({ all: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    customFormat
  ),
  transports: [new winston.transports.Console()],
});
