#!/bin/sh

# Start nginx in background first so Fly health check passes immediately
nginx

# Run database migrations (non-fatal — may fail before DB is attached)
cd /app
npx prisma migrate deploy 2>&1 || echo "Migration warning (may be first run)"

# Seed demo data on first deploy (idempotent — uses upserts)
npx prisma db seed 2>&1 || echo "Seed warning (non-fatal)"

# Start Next.js app in background
PORT=3001 node server.js &

# ── Start ForgeSmith (Hermes) if configured ──
if [ -n "$FORGESMITH_ENABLED" ] && [ "$FORGESMITH_ENABLED" = "true" ]; then
    echo "Starting ForgeSmith..."
    /opt/forgesmith/start-forgesmith.sh 2>&1 &
    echo "ForgeSmith started"
fi

# Wait for any process to exit — keeps container alive via nginx
wait -n 2>/dev/null || true

# If we get here, keep container alive with nginx in foreground
nginx -s stop 2>/dev/null
exec nginx -g 'daemon off;'
