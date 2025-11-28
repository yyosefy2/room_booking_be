#!/bin/sh
set -e

# Simple entrypoint: wait for MongoDB host:port to be available before starting.
# Optionally run seed when RUN_SEED=true

echo "[entrypoint] Parsing MONGO_URL..."
MONGO_HOSTPORT="${MONGO_URL:-mongodb://mongodb:27017}" 

# Extract host and port (supports simple mongodb://host:port/DB)
REGEX='mongodb://\([^/:]*\)[:]?\([0-9]*\)'
HOST=""
PORT=""

if echo "$MONGO_HOSTPORT" | grep -q "mongodb://"; then
  # naive parse
  HOST=$(echo "$MONGO_HOSTPORT" | sed -E 's#mongodb://([^/:]+):?([0-9]*).*#\1#')
  PORT=$(echo "$MONGO_HOSTPORT" | sed -E 's#mongodb://([^/:]+):?([0-9]*).*#\2#')
fi

# Fallback defaults
HOST=${HOST:-mongodb}
PORT=${PORT:-27017}

echo "[entrypoint] Waiting for MongoDB at $HOST:$PORT..."

# Use node helper if available, otherwise try netcat (not present in alpine), so loop with /dev/tcp if supported
if [ -x "./scripts/wait-for-tcp.js" ]; then
  node ./scripts/wait-for-tcp.js "$HOST" "$PORT" 60
else
  # fallback: try until port open
  COUNT=0
  while ! nc -z "$HOST" "$PORT" 2>/dev/null; do
    COUNT=$((COUNT+1))
    if [ "$COUNT" -gt 60 ]; then
      echo "[entrypoint] timeout waiting for $HOST:$PORT"
      exit 1
    fi
    echo "[entrypoint] waiting for $HOST:$PORT... ($COUNT)"
    sleep 1
  done
fi

echo "[entrypoint] MongoDB reachable"

if [ "${RUN_SEED}" = "true" ] || [ "${RUN_SEED}" = "1" ]; then
  echo "[entrypoint] RUN_SEED enabled - running seed script"
  npm run seed || {
    echo "[entrypoint] seed failed" >&2
  }
fi

echo "[entrypoint] Starting app: $@"
exec "$@"
