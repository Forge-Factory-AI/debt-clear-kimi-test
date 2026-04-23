# ── Stage 1: Dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apk add --no-cache openssl
WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
RUN pnpm install --frozen-lockfile --ignore-scripts 2>/dev/null || pnpm install --ignore-scripts

# ── Stage 2: Build ───────────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm --filter backend db:generate
RUN pnpm build

# ── Stage 3: Production ──────────────────────────────────────────────
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apk add --no-cache nginx curl openssl

WORKDIR /app

# Copy workspace config and package files
COPY pnpm-workspace.yaml package.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

# Install production dependencies
RUN pnpm install --frozen-lockfile --prod 2>/dev/null || pnpm install --prod

# Copy built backend and prisma schema
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/backend/prisma ./packages/backend/prisma

# Regenerate Prisma client for production runtime
RUN cd packages/backend && pnpm prisma generate

# Copy built frontend
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html

# ForgeSmith files
COPY forgesmith /opt/forgesmith

# Nginx config
RUN rm -f /etc/nginx/http.d/default.conf 2>/dev/null || true
COPY nginx.conf /etc/nginx/http.d/app.conf

# Startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=30s \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["/app/start.sh"]
