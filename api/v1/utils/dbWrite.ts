import crypto from "crypto";
import { scyllaClient } from "../lib/scylladb";
import { redisClient } from "../lib/redis";
import { logger } from "../lib/logger";

// ==========================================
//  Write-Through Persistence Utility
// ==========================================

interface SaveUrlParams {
  shortCode: string;
  longUrl: string;
  ttlInSeconds?: number; // Default 30 days
}

// SHA-256 helper for deduplication
export function generateUrlHash(url: string): string {
  return crypto.createHash("sha256").update(url.trim()).digest("hex");
}

export async function saveUrlMapping({
  shortCode,
  longUrl,
  ttlInSeconds = 2592000, // 30 days
}: SaveUrlParams) {
  const startTime = performance.now();
  const urlHash = generateUrlHash(longUrl);

  logger.info(
    `📝 [Storage] Initializing write: ${shortCode} -> ${longUrl} (Hash: ${urlHash.slice(0, 8)}..., TTL: ${ttlInSeconds}s)`,
  );

  // 1. Write to ScyllaDB with url_hash
  const scyllaQuery = `
    INSERT INTO shortener.urls (short_code, url_hash, long_url, created_at)
    VALUES (?, ?, ?, toTimestamp(now()))
    USING TTL ?;
  `;

  const scyllaPromise = scyllaClient
    .execute(scyllaQuery, [shortCode, urlHash, longUrl, ttlInSeconds], {
      prepare: true,
    })
    .then(() => {
      logger.info(
        `💾 [ScyllaDB] Saved mapping for code: ${shortCode} in ${(performance.now() - startTime).toFixed(2)}ms`,
      );
    });

  // 2. Write to Redis Cache for Resolver Service
  const redisPromise = redisClient
    .set(`code:${shortCode}`, longUrl, "EX", ttlInSeconds)
    .then(() => {
      logger.info(
        `⚡ [Redis] Cached mapping for code: ${shortCode} in ${(performance.now() - startTime).toFixed(2)}ms`,
      );
    });

  // Execute dual-write concurrently
  await Promise.all([scyllaPromise, redisPromise]);
  logger.info(
    `✅ [Storage] Dual-write complete for code: ${shortCode} in ${(performance.now() - startTime).toFixed(2)}ms`,
  );
}
