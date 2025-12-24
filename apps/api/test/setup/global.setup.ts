/**
 * Global setup for all Jest test types
 * This file runs once before all tests start
 *
 * Detects the test type from Jest config and applies appropriate settings
 * Automatically creates and migrates test databases using Prisma's programmatic API
 */

import { ensureTestDatabaseReady, setupTestEnvironment } from './shared';

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

  // Check command line arguments for config file hints
  const args = process.argv.join(' ');

  // Check for e2e patterns
  if (
    args.includes('e2e.config') ||
    args.includes('test:e2e') ||
    args.includes(':e2e') ||
    args.includes('e2e.spec')
  ) {
    return 'e2e';
  }

  // Check for integration patterns
  if (
    args.includes('integration.config') ||
    args.includes('test:integration') ||
    args.includes(':integration') ||
    args.includes('integration.spec')
  ) {
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
