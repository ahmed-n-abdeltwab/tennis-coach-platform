#!/bin/bash
# Production database migration script for Render deployment
# This script runs Prisma migrations in production without dotenv-cli

set -e

echo "🔄 Running database migrations..."

# Verify DATABASE_URL is set (required for production)
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  exit 1
fi

# Run Prisma migrate deploy (applies pending migrations)
# Note: migrate deploy is safe for production - it only applies pending migrations
# and does not create new migrations or modify the schema
npx prisma migrate deploy \
  --schema=./apps/api/prisma/schema.prisma \
  --config=./apps/api/prisma/prisma.config.ts

echo "✅ Database migrations completed successfully!"
