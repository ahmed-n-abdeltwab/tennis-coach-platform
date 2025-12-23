/**
 * Database setup utilities for test environments
 * Handles automatic database creation and schema synchronization
 * Reuses existing infrastructure from TestDatabaseManager
 */

import { execSync } from 'child_process';
import * as path from 'path';

import { PrismaClient } from '@prisma/client';

/**
 * Create a database if it doesn't exist using Prisma with pg adapter
 */
async function createDatabaseIfNotExists(baseUrl: string, databaseName: string): Promise<boolean> {
  // Dynamic imports for pg adapter (already in project dependencies)
  const { Pool } = await import('pg');
  const { PrismaPg } = await import('@prisma/adapter-pg');

  const adminUrl = `${baseUrl}/postgres?connect_timeout=10`;
  const pool = new Pool({ connectionString: adminUrl });
  const adapter = new PrismaPg(pool);

  const adminClient = new PrismaClient({ adapter });

  try {
    await adminClient.$connect();
    await adminClient.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
    return true; // Database was created
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return false; // Database already exists
    }
    throw error;
  } finally {
    await adminClient.$disconnect();
    await pool.end();
  }
}

/**
 * Run Prisma schema sync (db push) for the given database URL
 */
function syncPrismaSchema(databaseUrl: string): void {
  const cwd = path.resolve(__dirname, '../../..');

  // Use --config to point to the Prisma config file (Prisma 7+)
  execSync('pnpm exec prisma db push --accept-data-loss --config=./prisma/prisma.config.ts', {
    encoding: 'utf-8',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd,
  });
}

/**
 * Parse database URL to extract base URL and database name
 */
function parseDatabaseUrl(url: string): { baseUrl: string; databaseName: string } {
  const urlObj = new URL(url);
  const databaseName = urlObj.pathname.slice(1).split('?')[0]; // Remove leading / and query params

  if (!databaseName) {
    throw new Error(`Invalid database URL - missing database name: ${url}`);
  }

  const baseUrl = `${urlObj.protocol}//${urlObj.username}:${urlObj.password}@${urlObj.host}`;

  return { baseUrl, databaseName };
}

/**
 * Ensure the test database is ready for use
 * - Creates the database if it doesn't exist
 * - Syncs the Prisma schema
 *
 * @param databaseUrl - Full PostgreSQL connection URL
 * @returns Object with status information
 */
export async function ensureTestDatabaseReady(databaseUrl: string): Promise<{
  databaseCreated: boolean;
  schemaSynced: boolean;
  error?: string;
}> {
  const result = {
    databaseCreated: false,
    schemaSynced: false,
    error: undefined as string | undefined,
  };

  try {
    const { baseUrl, databaseName } = parseDatabaseUrl(databaseUrl);

    // Step 1: Create database if it doesn't exist
    try {
      result.databaseCreated = await createDatabaseIfNotExists(baseUrl, databaseName);
      if (result.databaseCreated) {
        // eslint-disable-next-line no-console
        console.log(`✅ Created database: ${databaseName}`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`✓ Database exists: ${databaseName}`);
      }
    } catch (createError) {
      const errorMessage = createError instanceof Error ? createError.message : String(createError);

      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect')) {
        result.error = `PostgreSQL server not reachable. Run 'pnpm docker:dev' to start the database.`;
        console.warn(`⚠️ ${result.error}`);
        return result;
      }

      // For other errors, try to continue - maybe the database exists
      console.warn(`⚠️ Could not check/create database: ${errorMessage}`);
    }

    // Step 2: Sync Prisma schema
    try {
      // eslint-disable-next-line no-console
      console.log(`🔄 Syncing database schema...`);
      syncPrismaSchema(databaseUrl);
      result.schemaSynced = true;
      // eslint-disable-next-line no-console
      console.log(`✅ Database schema synced.`);
    } catch (syncError) {
      const errorMessage = syncError instanceof Error ? syncError.message : String(syncError);
      result.error = `Schema sync failed: ${errorMessage}`;
      console.warn(`⚠️ ${result.error}`);
    }

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️ Database setup error: ${result.error}`);
    return result;
  }
}

/**
 * Drop a test database after tests complete
 *
 * @param databaseUrl - Full PostgreSQL connection URL
 * @returns Object with status information
 */
export async function dropTestDatabase(databaseUrl: string): Promise<{
  dropped: boolean;
  error?: string;
}> {
  const result = {
    dropped: false,
    error: undefined as string | undefined,
  };

  try {
    const { baseUrl, databaseName } = parseDatabaseUrl(databaseUrl);

    // Dynamic imports for pg adapter
    const { Pool } = await import('pg');
    const { PrismaPg } = await import('@prisma/adapter-pg');

    const adminUrl = `${baseUrl}/postgres?connect_timeout=10`;
    const pool = new Pool({ connectionString: adminUrl });
    const adapter = new PrismaPg(pool);

    const adminClient = new PrismaClient({ adapter });

    try {
      await adminClient.$connect();

      // Terminate active connections to the database
      await adminClient.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${databaseName}' AND pid <> pg_backend_pid()
      `);

      // Drop the database
      await adminClient.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
      result.dropped = true;

      // eslint-disable-next-line no-console
      console.log(`🗑️  Dropped database: ${databaseName}`);
    } finally {
      await adminClient.$disconnect();
      await pool.end();
    }

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    // Don't warn on drop failures - database might not exist
    return result;
  }
}
