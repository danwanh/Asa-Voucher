# Build context: repo root (npm workspaces share a single package-lock.json)
#   docker build -f backend/Dockerfile .

FROM node:20-bookworm-slim AS base
# Prisma's query engine needs OpenSSL
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- deps: install only the backend workspace ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY e2e/package.json e2e/package.json
RUN npm ci --workspace backend --include-workspace-root

# ---- build: generate Prisma client + compile TypeScript ----
FROM deps AS build
COPY backend backend
RUN npm --workspace backend run prisma:generate \
    && npm --workspace backend run build

# ---- runtime ----
# Keeps dev dependencies on purpose: the `prisma` CLI (migrate deploy)
# and `tsx` (seed scripts) are devDependencies and are run in the container.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
WORKDIR /app/backend
USER node
EXPOSE 5000
CMD ["node", "dist/server.js"]
