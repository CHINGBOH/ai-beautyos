# =============================================================================
# AI BeautyOS — Web/API production image
# Multi-stage build:
#   1. deps    — install all dependencies (incl. dev) via pnpm + corepack
#   2. builder — vite build (client) + esbuild (server bundle to dist/index.js)
#   3. runner  — minimal runtime image, prod deps only, non-root, healthcheck
#
# Build:
#   docker build \
#     --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
#     -t ai-beautyos:local .
#
# Run:
#   docker run --rm -p 3000:3000 --env-file .env ai-beautyos:local
# =============================================================================

ARG NODE_VERSION=20.18.1-alpine3.20

# -----------------------------------------------------------------------------
# Stage 1: deps — install all dependencies
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Enable pnpm via corepack (version pinned by package.json#packageManager)
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

RUN corepack prepare --activate

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2: builder — build client + server bundle
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/patches ./patches
COPY . .

RUN corepack prepare --activate

ENV NODE_ENV=production
RUN pnpm build

# Strip dev dependencies for the runner stage
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm prune --prod

# -----------------------------------------------------------------------------
# Stage 3: runner — minimal runtime image
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

RUN apk add --no-cache wget tini

ARG GIT_COMMIT=unknown
ENV NODE_ENV=production \
    PORT=3000 \
    GIT_COMMIT=${GIT_COMMIT} \
    # Cap V8's old-space heap so a leaking process is OOM-killed inside the
    # container memory limit instead of pushing the host into swap. Tune via
    # NODE_OPTIONS in compose / orchestrator for sizes other than 512 MiB.
    NODE_OPTIONS=--max-old-space-size=512

# Copy production node_modules + built artifacts + minimal runtime metadata
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
# System Registry (#21) reads docs/system-manifest.yaml at runtime.
COPY --from=builder /app/docs/system-manifest.yaml ./docs/system-manifest.yaml

# Run as non-root
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -q -O /dev/null --spider http://127.0.0.1:${PORT}/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]

LABEL org.opencontainers.image.title="ai-beautyos" \
      org.opencontainers.image.source="https://github.com/CHINGBOH/ai-beautyos" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.licenses="MIT"
