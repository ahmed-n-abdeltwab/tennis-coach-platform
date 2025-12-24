/**
 * Global teardown for all Jest test types
 * This file runs once after all tests complete
 *
 * Handles cleanup with appropriate delays based on test type
 * Drops test databases for integration and e2e tests
 */

import { delayForCleanup, dropTestDatabase, performGarbageCollection } from './shared';

/**
 * Detect test type from various sources
 */
function detectTestType(): 'unit' | 'integration' | 'e2e' {
  // Check explicit environment variable first
  const envTestType = process.env.JEST_TEST_TYPE;
  if (envTestType === 'integration' || envTestType === 'e2e') {
    return envTestType;
  }

  // Check NX_TASK_TARGET_TARGET which Nx sets when running tasks
  const nxTarget = process.env.NX_TASK_TARGET_TARGET ?? '';
  if (nxTarget.includes('e2e')) {
    return 'e2e';
  }
  if (nxTarget.includes('integration')) {
    return 'integration';
  }

  // Check Jest config displayName if available
  const jestConfig = (global as Record<string, unknown>).jestConfig as
    | { displayName?: string }
    | undefined;
  const displayName = jestConfig?.displayName ?? '';

  if (displayName.toLowerCase().includes('e2e')) {
    return 'e2e';
  }
  if (displayName.toLowerCase().includes('integration')) {
    return 'integration';
  }

  return 'unit';
}

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
  }

  // eslint-disable-next-line no-console
  console.log('🧹 Global Jest teardown completed');

  // Force garbage collection if available
  performGarbageCollection();

  // Allow time for connections to close
  await delayForCleanup(cleanupDelay);
}
