/**
 * Global setup for all Jest test types
 * This file runs once before all tests start
 *
 * Detects the test type from Jest config and applies appropriate settings
 * Automatically creates and migrates test databases using Prisma's programmatic API
 */

import { detectTestType, ensureTestDatabaseReady, setupTestEnvironment } from './shared';

export default async function globalSetup(): Promise<void> {
  // Detect test type
  const testType = detectTestType();

  // Determine database suffix and port based on test type
  let databaseSuffix = 'test';
  let port = '0'; // Default to random port

  if (testType === 'integration') {
    databaseSuffix = 'test_integration';
    port = '3333';
  } else if (testType === 'e2e') {
    databaseSuffix = 'test_e2e';
    port = '0';
  }

  const databaseName = `tennis_coach_${databaseSuffix}`;

  // Use existing DATABASE_URL if set (e.g., in CI), otherwise build from defaults
  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.includes(databaseSuffix)) {
    const dbPassword = process.env.DB_PASSWORD ?? 'password';
    const dbUser = process.env.DB_USER ?? 'postgres';
    const dbHost = process.env.DB_HOST ?? 'localhost';
    const dbPort = process.env.DB_PORT ?? '5432';
    databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${databaseName}?connection_limit=5&pool_timeout=2`;
  }

  // Set up common test environment variables first
  setupTestEnvironment({
    databaseSuffix,
    port,
    useStrictAssignment: false, // Use ??= to preserve CI variables
  });

  // Ensure DATABASE_URL is set
  process.env.DATABASE_URL = databaseUrl;

  // Only run database setup for integration and e2e tests (skip in CI where db is pre-created)
  const isCI = process.env.CI === 'true';
  if (databaseSuffix !== 'test' && !isCI) {
    // eslint-disable-next-line no-console
    console.log(`\n🗄️  Setting up test database: ${databaseName}`);

    // Create database if needed and sync schema
    await ensureTestDatabaseReady(databaseUrl);
  } else if (isCI) {
    // eslint-disable-next-line no-console
    console.log(`\n🗄️  Using CI-provided database: ${databaseName}`);
  }

  // eslint-disable-next-line no-console
  console.log(`🚀 Global Jest setup completed (${databaseSuffix})\n`);
}
