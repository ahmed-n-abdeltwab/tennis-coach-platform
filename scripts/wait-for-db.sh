#!/bin/bash
# Wait for PostgreSQL to be ready and setup databases (dev + test)

set -e

HOST="${DB_HOST:-localhost}"
PORT="${DB_PORT:-5432}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_INTERVAL="${RETRY_INTERVAL:-2}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"
CONTAINER_NAME="${POSTGRES_CONTAINER:-tennis-coach-postgres}"

# Database names
DEV_DB="tennis_coach_dev"
TEST_DB="tennis_coach_test"
TEST_INTEGRATION_DB="tennis_coach_test_integration"
TEST_E2E_DB="tennis_coach_test_e2e"

echo "Waiting for PostgreSQL container to be ready..."

# Wait for container to be healthy
for i in $(seq 1 $MAX_RETRIES); do
  # Check if container is running and healthy
  HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "not_found")

  if [ "$HEALTH" = "healthy" ]; then
    echo "PostgreSQL container is healthy!"
    break
  fi

  echo "Attempt $i/$MAX_RETRIES: PostgreSQL not ready yet (status: $HEALTH), retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL

  if [ $i -eq $MAX_RETRIES ]; then
    echo "Error: PostgreSQL did not become ready in time"
    exit 1
  fi
done

# Additional wait to ensure database is fully accepting connections
sleep 2

# Fix template1 collation issue (Prisma shadow database requirement)
# This fixes: "template database template1 has a collation version mismatch"
fix_template1_collation() {
  echo ""
  echo "Checking template1 collation..."

  # Check if template1 has collation issues by attempting a test
  if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -c "CREATE DATABASE _prisma_collation_test WITH TEMPLATE template1;" 2>&1 | grep -q "collation version"; then
    echo "Fixing template1 collation issue..."
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -c "ALTER DATABASE template1 IS_TEMPLATE false;" 2>/dev/null || true
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS template1;" 2>/dev/null || true
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -c "CREATE DATABASE template1 WITH TEMPLATE = template0 ENCODING = 'UTF8' LC_COLLATE = 'C' LC_CTYPE = 'C';" 2>/dev/null || true
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -c "ALTER DATABASE template1 IS_TEMPLATE true;" 2>/dev/null || true
    echo "template1 collation fixed!"
  else
    # Clean up test database if it was created
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS _prisma_collation_test;" 2>/dev/null || true
    echo "template1 collation is OK."
  fi
}

fix_template1_collation

# Function to create database if it doesn't exist (using docker exec)
create_db_if_not_exists() {
  local db_name=$1
  echo "Checking if database '$db_name' exists..."

  # Use docker exec to run psql inside the container
  if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$db_name"; then
    echo "Database '$db_name' already exists."
  else
    echo "Creating database '$db_name'..."
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -c "CREATE DATABASE $db_name;" 2>/dev/null || true
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
