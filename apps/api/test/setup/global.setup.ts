/**
 * Global setup for all Jest test types
 * This file runs once before all tests start
 *
 * Detects the test type from Jest config and applies appropriate settings
 */

import { setupTestEnvironment } from './shared';

export default async function globalSetup(): Promise<void> {
  // Detect test type from Jest's displayName or test patterns
  const jestConfig = (global as any).jestConfig;
  const displayName = jestConfig?.displayName || '';

  // Determine database suffix and port based on test type
  let databaseSuffix = 'test';
  let port = '0'; // Default to random port

  if (displayName.includes('Integration') || process.env.JEST_TEST_TYPE === 'integration') {
    databaseSuffix = 'test_integration';
    port = '3333';
  } else if (displayName.includes('E2E') || process.env.JEST_TEST_TYPE === 'e2e') {
    databaseSuffix = 'test_e2e';
    port = '0';
  }

  // Set up common test environment variables
  setupTestEnvironment({
    databaseSuffix,
    port,
    useStrictAssignment: false, // Use ??= to preserve CI variables
  });

  console.log(`🚀 Global Jest setup completed (${databaseSuffix})`);
}
