# syntax=docker/dockerfile:1

# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# Copy workspace config files first (better layer caching)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY prisma/ prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/server/ apps/server/
COPY packages/shared/ packages/shared/

# Build shared package first
RUN pnpm --filter @crucible/shared build

# Generate Prisma client (schema is at workspace root, pin to v6 to match project)
RUN pnpm dlx prisma@6.0.1 generate --schema=prisma/schema.prisma

# Build server
RUN pnpm --filter @crucible/server build

# Deploy server to a standalone directory with all dependencies resolved
RUN pnpm --filter @crucible/server deploy --prod /deploy

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

# Install pnpm for prisma migrations
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# Copy deployed bundle (all deps resolved, no symlinks)
COPY --from=builder /deploy/node_modules ./node_modules
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/apps/server/generated ./generated

# Create startup script for migrations
RUN printf '#!/bin/sh\npnpm dlx prisma@6.0.1 migrate deploy --schema=prisma/schema.prisma\nnode dist/index.js\n' > /app/start.sh && chmod +x /app/start.sh

ENV NODE_ENV=production
ENV COLYSEUS_PORT=2567

EXPOSE 2567

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:2567/health || exit 1

CMD ["/app/start.sh"]
