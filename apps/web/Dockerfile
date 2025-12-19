# syntax=docker/dockerfile:1

# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# Copy workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY prisma/schema.prisma prisma/

RUN pnpm install --frozen-lockfile

COPY apps/web/ apps/web/
COPY packages/shared/ packages/shared/

# Generate Prisma client for web app (modify schema to use default output)
RUN sed 's|output.*=.*"../apps/server/generated/prisma"||g' prisma/schema.prisma > prisma/schema.web.prisma && \
    npx prisma generate --schema=./prisma/schema.web.prisma

# Build shared first
RUN pnpm --filter @crucible/shared build

# Build args for Next.js public env vars (baked at build time)
ARG NEXT_PUBLIC_COLYSEUS_URL=ws://localhost:2567
ARG NEXT_PUBLIC_APP_URL=http://localhost:3210
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_COLYSEUS_URL=$NEXT_PUBLIC_COLYSEUS_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

RUN pnpm --filter @crucible/web build

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3210

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3210

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3210/api/health || exit 1

CMD ["node", "apps/web/server.js"]
