# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# src/lib/db.ts throws at import time without a DATABASE_URL; give the build
# a placeholder — no connection is opened during `next build`.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV SESSION_SECRET=build-placeholder
RUN npm run build

FROM node:20-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN chown -R node:node /app
USER node
EXPOSE 3001
CMD ["node", "server.js"]
