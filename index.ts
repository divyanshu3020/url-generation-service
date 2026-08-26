import Fastify from "fastify";
import cors from "@fastify/cors";
import route from "./api/v1/routes/index";
import { initScyllaDB, scyllaClient } from "./api/v1/lib/scylladb";
import { redisClient } from "./api/v1/lib/redis";
import { logger } from "./api/v1/lib/logger";
import fastifyRateLimit from "@fastify/rate-limit"

const app = Fastify();
const port = 3001;

// Allowed Domains
const allowedOrigins = ["https://example.com", "http://localhost:3000"];

await app.register(fastifyRateLimit, {
  global: false, // Set to false to configure per-route
  max: 100,      // Fallback max requests
  timeWindow: "1 minute",
  redis: redisClient, // Optional: pass your existing Redis instance
});

// Register CORS
app.register(cors, {
  // Origin validation dynamically checks the incoming request header
  origin: (origin, callback) => {
    // !origin allows server-to-server or tools like Postman to pass through
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Blocked by CORS policy: Origin not allowed."), false);
    }
  },

  // Restrict allowed HTTP verbs
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

  // Whitelist headers clients can send
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],

  // Whitelist custom headers clients can read from the server response
  exposedHeaders: ["X-Total-Count", "Content-Range"],

  // Required if your client sends cookies, authorization headers, or TLS client certificates
  credentials: false,

  // Cache preflight OPTIONS responses in the browser (in seconds)
  maxAge: 86400, // 24 hours

  // Automatically sends 204 No Content status for legacy browsers (IE11/smart TVs)
  optionsSuccessStatus: 204,
});

// Register API routes
app.register(route, { prefix: "/api/v1" });

// Health check endpoint
app.get("/health", async (request, reply) => {
  let scyllaStatus = "unknown";
  let redisStatus = "unknown";
  let isHealthy = true;

  try {
    await scyllaClient.execute("SELECT now() FROM system.local");
    scyllaStatus = "connected";
  } catch (err: any) {
    scyllaStatus = `error: ${err.message || err}`;
    isHealthy = false;
  }

  try {
    const pingResponse = await redisClient.ping();
    if (pingResponse === "PONG") {
      redisStatus = "connected";
    } else {
      redisStatus = `error: unexpected response ${pingResponse}`;
      isHealthy = false;
    }
  } catch (err: any) {
    redisStatus = `error: ${err.message || err}`;
    isHealthy = false;
  }

  reply.status(isHealthy ? 200 : 500).send({
    status: isHealthy ? "healthy" : "unhealthy",
  });
});

// Start the server
const start = async () => {
  try {
    // Initialize ScyllaDB (runs keyspace & table setup)
    await initScyllaDB();

    const address = await app.listen({ port, host: "0.0.0.0" });
    logger.info(`Url shortner service is up and running on ${address}`);
  } catch (err) {
    logger.error(`Failed to start server: ${err}`);
    process.exit(1);
  }
};

start();
