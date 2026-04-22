# Multi-stage Dockerfile for DebtClear monorepo
# Backend (Express) + Frontend (React/Vite) served via nginx

# ── Stage 1: Base with pnpm ──────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── Stage 2: Install dependencies ────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
RUN pnpm install --frozen-lockfile --ignore-scripts 2>/dev/null || pnpm install --ignore-scripts

# ── Stage 3: Build packages ──────────────────────────────────────────
FROM deps AS build
COPY . .

# Generate Prisma client
RUN cd packages/backend && npx prisma generate

# Build backend
RUN cd packages/backend && pnpm build

# Build frontend
RUN cd packages/frontend && pnpm build

# ── Stage 4: Production image ────────────────────────────────────────
FROM node:20-alpine

# Install nginx and curl for healthcheck
RUN apk add --no-cache nginx curl

RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Copy root workspace files
COPY package.json pnpm-workspace.yaml ./

# Copy backend production files
COPY --from=build /app/packages/backend/package.json ./packages/backend/
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/backend/prisma ./packages/backend/prisma

# Copy frontend build output
COPY --from=build /app/packages/frontend/dist ./packages/frontend/dist

# Install all dependencies (need Prisma CLI + tsx for migrations/seed at runtime)
RUN pnpm install --ignore-scripts

# Nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=30s \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["/app/start.sh"]
