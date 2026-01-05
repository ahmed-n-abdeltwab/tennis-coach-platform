/**
 * Global teardown for all Jest test types
 * This file runs once after all tests complete
 *
 * Handles cleanup with appropriate delays based on test type
 * Drops test databases for integration and e2e tests
 */

import {
  cleanupRedis,
  delayForCleanup,
  detectTestType,
  dropTestDatabase,
  performGarbageCollection,
} from './shared';

export default async function globalTeardown(): Promise<void> {
  // Detect test type
  const testType = detectTestType();

  let cleanupDelay = 500; // Default delay

  if (testType === 'integration') {
    cleanupDelay = 1000;
  } else if (testType === 'e2e') {
    cleanupDelay = 2000;
  }

  // Drop test database for integration and e2e tests (skip in CI)
  const isCI = process.env.CI === 'true';
  if ((testType === 'integration' || testType === 'e2e') && !isCI) {
    const databaseSuffix = testType === 'integration' ? 'test_integration' : 'test_e2e';
    const databaseName = `tennis_coach_${databaseSuffix}`;
    const dbPassword = process.env.DB_PASSWORD ?? 'password';
    const dbUser = process.env.DB_USER ?? 'postgres';
    const dbHost = process.env.DB_HOST ?? 'localhost';
    const dbPort = process.env.DB_PORT ?? '5432';
    const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${databaseName}`;

    await dropTestDatabase(databaseUrl);

    // Cleanup Redis
    await cleanupRedis();
  }

  // eslint-disable-next-line no-console
  console.log('🧹 Global Jest teardown completed');

  // Force garbage collection if available
  performGarbageCollection();

  // Allow time for connections to close
  await delayForCleanup(cleanupDelay);
}
