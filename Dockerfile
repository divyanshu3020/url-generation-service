# 1. Official lightweight Bun runtime
FROM oven/bun:1-alpine AS base
WORKDIR /app

# 2. Install dependencies first (leverages Docker cache layer)
COPY package.json bun.lock* ./
RUN bun install --production --frozen-lockfile

# 3. Copy source code
COPY . .

USER bun

# 4. Document container port
EXPOSE 3000

# 5. Start Fastify application
CMD ["bun", "run", "index.ts"]