# Build context: repo root (npm workspaces share a single package-lock.json)
#   docker build -f frontend/Dockerfile .

FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps: install only the frontend workspace ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
COPY e2e/package.json e2e/package.json
RUN npm ci --workspace frontend --include-workspace-root

# ---- build ----
FROM deps AS build
# NEXT_PUBLIC_* values are inlined into the JS bundle at build time,
# so they must be passed as build args (not runtime env).
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
ARG NEXT_PUBLIC_SUPABASE_URL=
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
COPY frontend frontend
RUN npm --workspace frontend run build

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
WORKDIR /app/frontend
USER node
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
