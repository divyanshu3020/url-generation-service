# 1. Use the actively patched Alpine base for Bun v1
FROM oven/bun:1-alpine AS base
WORKDIR /app

# 2. Upgrade OS packages to clear out any remaining OS-level CVEs
RUN apk update && apk upgrade --no-cache

# 3. Install dependencies first (leverages Docker cache layer)
COPY package.json bun.lock* ./
RUN bun install --production --frozen-lockfile

COPY . .

# 5. Run as non-root user
USER bun

EXPOSE 3000

# 7. Start Fastify application
CMD ["bun", "run", "index.ts"]