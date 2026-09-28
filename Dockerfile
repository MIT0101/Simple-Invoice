# syntax=docker/dockerfile:1

ARG NODE_VERSION=24

# ---- deps: install all dependencies (dev deps are needed for the build) ----
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
# Toolchain for compiling better-sqlite3 when no prebuilt binary matches the platform.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- builder: produce the standalone Next.js server ----
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# public/ may be empty (and then missing from a git checkout); the runner copies it.
RUN mkdir -p public && npm run build

# ---- runner: minimal runtime image ----
FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=3000 \
  HOSTNAME=0.0.0.0 \
  DATABASE_PATH=/app/data/invoices.db

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# SQL migrations, applied automatically at startup.
COPY --from=builder --chown=node:node /app/drizzle ./drizzle

RUN mkdir -p /app/data && chown node:node /app/data
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "server.js"]
