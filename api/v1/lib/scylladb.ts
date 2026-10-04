import cassandra from "cassandra-driver";
import { logger } from "./logger";

// ==========================================
// 1. ScyllaDB Driver Setup (CQL Protocol)
// ==========================================
const isProduction = process.env.NODE_ENV === "production";
const scyllaHost = process.env.SCYLLA_HOST || "localhost";
const scyllaUser = process.env.SCYLLA_USER;
const scyllaPassword = process.env.SCYLLA_PASSWORD;

if (
  isProduction &&
  (!process.env.SCYLLA_HOST || !scyllaUser || !scyllaPassword)
) {
  throw new Error(
    "SCYLLA_HOST, SCYLLA_USER, and SCYLLA_PASSWORD are required in production",
  );
}

export const scyllaClient = new cassandra.Client({
  contactPoints: [scyllaHost],
  localDataCenter: "datacenter1",
  authProvider:
    scyllaUser && scyllaPassword
      ? new cassandra.auth.PlainTextAuthProvider(scyllaUser, scyllaPassword)
      : undefined,
});

export async function initScyllaDB() {
  try {
    await scyllaClient.connect();
    logger.info("⚡ [ScyllaDB] Connected successfully.");

    // 1. Keyspace Setup
    await scyllaClient.execute(`
      CREATE KEYSPACE IF NOT EXISTS shortener 
      WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': 1};
    `);

    // 2. Table with url_hash column
    await scyllaClient.execute(`
      CREATE TABLE IF NOT EXISTS shortener.urls (
        short_code text,
        url_hash text,
        long_url text,
        created_at timestamp,
        PRIMARY KEY (short_code)
      );
    `);

    // 3. Secondary Index for fast duplicate lookup via SHA-256 hash
    await scyllaClient.execute(`
      CREATE INDEX IF NOT EXISTS urls_url_hash_idx 
      ON shortener.urls (url_hash);
    `);

    logger.info("⚡ [ScyllaDB] Table 'urls' and Index verified.");
  } catch (err: any) {
    logger.error(`❌ [ScyllaDB] Connection error: ${err.message || err}`);
    process.exit(1);
  }
}
