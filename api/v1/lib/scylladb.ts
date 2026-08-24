import cassandra from "cassandra-driver";
import { logger } from "./logger";

// ==========================================
// 1. ScyllaDB Driver Setup (CQL Protocol)
// ==========================================
export const scyllaClient = new cassandra.Client({
  contactPoints: [process.env.SCYLLA_HOST || "localhost"],
  localDataCenter: "datacenter1",
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