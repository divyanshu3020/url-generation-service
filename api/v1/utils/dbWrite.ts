import { scyllaClient } from "../lib/scylladb";
import { redisClient } from "../lib/redis";
import { logger } from "../lib/logger";

// ==========================================
//  Write-Through Persistence Utility
// ==========================================

interface SaveUrlParams {
  shortCode: string;
  longUrl: string;
  ttlInSeconds?: number; // Optional TTL (e.g., 604800 = 7 days)
}

export async function saveUrlMapping({
  shortCode,
  longUrl,
  ttlInSeconds = 2592000, // Default 30 days expiry
}: SaveUrlParams) {
  const startTime = performance.now();
  logger.info(
    `📝 [Storage] Initializing write: ${shortCode} -> ${longUrl} (TTL: ${ttlInSeconds}s)`,
  );

  // Query A: Write to ScyllaDB using CQL native USING TTL clause
  const scyllaQuery = `
    INSERT INTO shortener.urls (short_code, long_url, created_at)
    VALUES (?, ?, toTimestamp(now()))
    USING TTL ?;
  `;

  const scyllaPromise = scyllaClient
    .execute(scyllaQuery, [shortCode, longUrl, ttlInSeconds], { prepare: true })
    .then(() => {
      logger.info(
        `💾 [ScyllaDB] Saved mapping for code: ${shortCode} in ${(performance.now() - startTime).toFixed(2)}ms`,
      );
    });

  // Query B: Write to Redis Cache with EX (seconds TTL)
  const redisPromise = redisClient
    .set(shortCode, longUrl, "EX", ttlInSeconds)
    .then(() => {
      logger.info(
        `⚡ [Redis] Cached mapping for code: ${shortCode} in ${(performance.now() - startTime).toFixed(2)}ms`,
      );
    });

  // Execute dual-write concurrently using Promise.all
  await Promise.all([scyllaPromise, redisPromise]);
  logger.info(
    `✅ [Storage] Dual-write complete for code: ${shortCode} in ${(performance.now() - startTime).toFixed(2)}ms`,
  );
}
