import Redis from "ioredis"
import { logger } from "./logger";

// ==========================================
// Redis Cache Setup (ioredis)
// ==========================================
export const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: 3,
});

redisClient.on("connect", () => {
  logger.info("⚡ [Redis] Connected successfully.");
});

redisClient.on("error", (err: any) => {
  logger.error(`❌ [Redis] Error: ${err.message || err}`);
});