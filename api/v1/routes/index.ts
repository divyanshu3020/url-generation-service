import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifySchema,
} from "fastify";
import { generateShortCode } from "../utils/shortCodeGenerator";
import { saveUrlMapping, generateUrlHash } from "../utils/dbWrite";
import { logger } from "../lib/logger";
import { scyllaClient } from "../lib/scylladb";

interface ShortenBody {
  url: string;
}

const shortenSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["url"],
    properties: {
      url: {
        type: "string",
        format: "uri",
        pattern: "^https?://",
        maxLength: 2048,
      },
    },
  },
  response: {
    429: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
      },
    },
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: {
          type: "object",
          properties: {
            shortcode: { type: "string" },
            longUrl: { type: "string" },
            shortUrl: { type: "string" },
          },
        },
      },
    },
    400: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
      },
    },
    500: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
      },
    },
  },
};

const apiV1Router: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post<{ Body: ShortenBody }>(
    "/shorten",
    {
      schema: shortenSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
          errorResponseBuilder: () => ({
            success: false,
            message: "Rate limit exceeded. Please try again later.",
          }),
        },
      },
    },
    async (request, reply) => {
      const longUrl = request.body.url;

      if (!longUrl) {
        return reply
          .status(400)
          .send({ success: false, message: "Missing 'url' parameter" });
      }

      // 1. Check for existing mapping via secondary index on url_hash
      try {
        const urlHash = generateUrlHash(longUrl);

        const query = `
          SELECT short_code FROM shortener.urls 
          WHERE url_hash = ? 
          LIMIT 1;
        `;

        const result = await scyllaClient.execute(query, [urlHash], {
          prepare: true,
        });

        const firstRow = result.first();

        if (firstRow) {
          const existingCode = firstRow.get("short_code") as string;
          return {
            success: true,
            message: "Existing short URL found",
            data: {
              shortcode: existingCode,
              longUrl,
              shortUrl: `http://localhost:3002/api/v1/${existingCode}`,
            },
          };
        }
      } catch (err: any) {
        logger.error(`❌ [ScyllaDB] Lookup error: ${err.message || err}`);
      }

      // 2. Generate new shortcode
      const shortcode = generateShortCode();

      // 3. Persist to ScyllaDB & cache in Redis
      try {
        await saveUrlMapping({
          shortCode: shortcode,
          longUrl,
        });
      } catch (err: any) {
        logger.error(
          `❌ [Route] Error saving URL mapping: ${err.message || err}`,
        );
        return reply
          .status(500)
          .send({ success: false, message: "Failed to persist short URL" });
      }

      return {
        success: true,
        message: "URL shortened successfully",
        data: {
          shortcode,
          longUrl,
          shortUrl: `http://localhost:3002/api/v1/${shortcode}`,
        },
      };
    },
  );
};

export default apiV1Router;
