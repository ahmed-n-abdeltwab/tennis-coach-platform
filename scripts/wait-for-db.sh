#!/bin/bash
# Wait for PostgreSQL to be ready

set -e

HOST="${DB_HOST:-localhost}"
PORT="${DB_PORT:-5432}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_INTERVAL="${RETRY_INTERVAL:-2}"

echo "Waiting for PostgreSQL at $HOST:$PORT..."

for i in $(seq 1 $MAX_RETRIES); do
  if pg_isready -h "$HOST" -p "$PORT" > /dev/null 2>&1; then
    echo "PostgreSQL is ready!"
    exit 0
  fi

  # Fallback: try connecting with psql or nc if pg_isready isn't available
  if command -v nc &> /dev/null; then
    if nc -z "$HOST" "$PORT" 2>/dev/null; then
      echo "PostgreSQL port is open, waiting for full readiness..."
      sleep 2
      echo "PostgreSQL is ready!"
      exit 0
    fi
  fi

  echo "Attempt $i/$MAX_RETRIES: PostgreSQL not ready yet, retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

echo "Error: PostgreSQL did not become ready in time"
exit 1
