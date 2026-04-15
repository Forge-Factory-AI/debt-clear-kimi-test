# ForgeSmith integration - FORGESMITH_ENABLED=true starts Hermes

# ── Stage 1: Install all dependencies ────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY pnpm-lock.yaml* package.json ./
RUN pnpm install --frozen-lockfile --ignore-scripts 2>/dev/null || pnpm install --ignore-scripts

# ── Stage 2: Build the app ──────────────────────────────────────────
FROM deps AS build
COPY . .
RUN npx prisma generate
RUN pnpm build

# ── Stage 3: Production dependencies ────────────────────────────────
FROM node:20-alpine AS prod-deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY pnpm-lock.yaml* package.json ./
RUN pnpm install --frozen-lockfile --prod || true

# ── Stage 4: Final image (Debian-slim for Hermes/Python support) ────
FROM node:20-slim

# Install system dependencies for app + Hermes + GitHub CLI
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    curl \
    git \
    python3 \
    python3-venv \
    python3-pip \
    ripgrep \
    procps \
    wget \
    gpg \
    && install -d -m 0755 /etc/apt/keyrings \
    && wget -qO /etc/apt/keyrings/githubcli-archive-keyring.gpg https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy prod deps (pnpm hoists to root node_modules)
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy build artifacts
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma

# Re-generate Prisma client for the Debian runtime (alpine generated musl binary)
RUN npx prisma generate

# ── Install Hermes ──
WORKDIR /opt/hermes
RUN git clone https://github.com/NousResearch/hermes-agent.git . \
    && pip install --break-system-packages uv \
    && uv venv .venv --python python3 \
    && . .venv/bin/activate \
    && uv pip install -e ".[all]" \
    && uv pip install fastapi "uvicorn[standard]" python-multipart

WORKDIR /app

# Nginx config, startup script, and ForgeSmith config
# Remove default nginx config and add ours
RUN rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf 2>/dev/null || true
COPY nginx.conf /etc/nginx/conf.d/app.conf
COPY start.sh /app/start.sh
COPY forgesmith/ /opt/forgesmith/
RUN chmod +x /app/start.sh /opt/forgesmith/start-forgesmith.sh

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=30s \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["/app/start.sh"]
