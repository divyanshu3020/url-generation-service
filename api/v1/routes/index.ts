import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { generateShortCode } from "../utils/shortCodeGenerator";
import { saveUrlMapping } from "../utils/dbWrite";
import { logger } from "../lib/logger";
import type { FastifySchema } from "fastify";

interface ShortenQuery {
  url: string;
}
interface Shortenbody {
  url: string;
}

const shortenSchema: FastifySchema = {
  querystring: {
    type: "object",
    required: ["url"],
    properties: {
      url: { type: "string", format: "uri" },
    },
  },

  body: {
    type: "object",
    required: ["url"],
    properties: {
      url: { type: "string", format: "uri" },
    },
  },

  response: {
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
  // 1. Shorten URL Endpoint (if sending long url in url itself as query)
  fastify.get<{ Querystring: ShortenQuery }>(
    "/shorten",
    { schema: shortenSchema },
    async (request, reply) => {
      const longUrl = request.query.url;

      if (!longUrl) {
        return reply
          .status(400)
          .send({ success: false, message: "Missing 'url' parameter" });
      }

      const shortcode = generateShortCode();

      // Persist mapping to DB & Redis Cache
      try {
        await saveUrlMapping({
          shortCode: shortcode,
          longUrl: longUrl,
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
          shortUrl: `http://localhost:3000/api/v1/${shortcode}`,
        },
      };
    },
  );

  // Shortend URL Endpoint (if sending through any frontend in body)
  fastify.post<{Body:Shortenbody }>(
    "/shorten",
    { schema: shortenSchema },
    async (request, reply) => {
      const longUrl = request!.body.url;

      if (!longUrl) {
        return reply
          .status(400)
          .send({ success: false, message: "Missing 'url' parameter" });
      }

      const shortcode = generateShortCode();

      // Persist mapping to DB & Redis Cache
      try {
        await saveUrlMapping({
          shortCode: shortcode,
          longUrl: longUrl,
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
          shortUrl: `http://localhost:3000/api/v1/${shortcode}`,
        },
      };
    },
  );
};

export default apiV1Router;
