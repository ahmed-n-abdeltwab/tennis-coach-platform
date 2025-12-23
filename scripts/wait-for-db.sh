#!/bin/bash
# Wait for PostgreSQL to be ready and setup databases (dev + test)

set -e

HOST="${DB_HOST:-localhost}"
PORT="${DB_PORT:-5432}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_INTERVAL="${RETRY_INTERVAL:-2}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"

# Database names
DEV_DB="tennis_coach_dev"
TEST_DB="tennis_coach_test"
TEST_INTEGRATION_DB="tennis_coach_test_integration"
TEST_E2E_DB="tennis_coach_test_e2e"

echo "Waiting for PostgreSQL at $HOST:$PORT..."

for i in $(seq 1 $MAX_RETRIES); do
  if pg_isready -h "$HOST" -p "$PORT" > /dev/null 2>&1; then
    echo "PostgreSQL is ready!"
    break
  fi

  # Fallback: try connecting with psql or nc if pg_isready isn't available
  if command -v nc &> /dev/null; then
    if nc -z "$HOST" "$PORT" 2>/dev/null; then
      echo "PostgreSQL port is open, waiting for full readiness..."
      sleep 2
      break
    fi
  fi

  echo "Attempt $i/$MAX_RETRIES: PostgreSQL not ready yet, retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL

  if [ $i -eq $MAX_RETRIES ]; then
    echo "Error: PostgreSQL did not become ready in time"
    exit 1
  fi
done

# Function to create database if it doesn't exist
create_db_if_not_exists() {
  local db_name=$1
  echo "Checking if database '$db_name' exists..."

  if PGPASSWORD=$DB_PASSWORD psql -h "$HOST" -p "$PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$db_name"; then
    echo "Database '$db_name' already exists."
  else
    echo "Creating database '$db_name'..."
    PGPASSWORD=$DB_PASSWORD psql -h "$HOST" -p "$PORT" -U "$DB_USER" -c "CREATE DATABASE $db_name;" 2>/dev/null || true
    echo "Database '$db_name' created."
  fi
}

# Create test databases
echo ""
echo "Setting up test databases..."
create_db_if_not_exists "$TEST_DB"
create_db_if_not_exists "$TEST_INTEGRATION_DB"
create_db_if_not_exists "$TEST_E2E_DB"

echo ""
echo "All databases are ready!"
echo "  - Dev: $DEV_DB"
echo "  - Test: $TEST_DB"
echo "  - Test Integration: $TEST_INTEGRATION_DB"
echo "  - Test E2E: $TEST_E2E_DB"
