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
  sslOptions:
    process.env.SCYLLA_TLS === "true"
      ? { rejectUnauthorized: true }
      : undefined,
});

export async function initScyllaDB() {
  try {
    await scyllaClient.connect();
    logger.info("⚡ [ScyllaDB] Connected successfully.");

    // Ensure Keyspace and Table exist with Native TTL support
    await scyllaClient.execute(`
      CREATE KEYSPACE IF NOT EXISTS shortener 
      WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': 1};
    `);

    await scyllaClient.execute(`
      CREATE TABLE IF NOT EXISTS shortener.urls (
        short_code text,
        long_url text,
        created_at timestamp,
        PRIMARY KEY (short_code)
      );
    `);
    logger.info("⚡ [ScyllaDB] Table 'urls' verified.");
  } catch (err: any) {
    logger.error(`❌ [ScyllaDB] Connection error: ${err.message || err}`);
    process.exit(1);
  }
}

// next task to do
// now i need to understnd how this cassendra cql works and how to use it to store and retrieve data.
// n then how this write will happen in redis too and also with how to set config for them
