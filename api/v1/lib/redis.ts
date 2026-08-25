import Redis from "ioredis";
import { logger } from "./logger";

// ==========================================
// Redis Cache Setup (ioredis)
// ==========================================
const isProduction = process.env.NODE_ENV === "production";
const redisHost = process.env.REDIS_HOST || "localhost";
const redisPassword = process.env.REDIS_PASSWORD;

if (isProduction && (!process.env.REDIS_HOST || !redisPassword)) {
  throw new Error("REDIS_HOST and REDIS_PASSWORD are required in production");
}

export const redisClient = new Redis({
  host: redisHost,
  port: Number(process.env.REDIS_PORT || 6379),
  password: redisPassword,
  tls: process.env.REDIS_TLS === "true" ? {} : undefined,
  maxRetriesPerRequest: 3,
});

redisClient.on("connect", () => {
  logger.info("⚡ [Redis] Connected successfully.");
});

redisClient.on("error", (err: any) => {
  logger.error(`❌ [Redis] Error: ${err.message || err}`);
});
