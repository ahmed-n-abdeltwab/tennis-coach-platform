/**
 * Global teardown for all Jest test types
 * This file runs once after all tests complete
 *
 * Handles cleanup with appropriate delays based on test type
 */

import { delayForCleanup, performGarbageCollection } from './shared';

export default async function globalTeardown(): Promise<void> {
  // Detect test type for appropriate cleanup delay
  const jestConfig = (global as any).jestConfig;
  const displayName = jestConfig?.displayName || '';

  let cleanupDelay = 500; // Default delay

  if (displayName.includes('Integration') || process.env.JEST_TEST_TYPE === 'integration') {
    cleanupDelay = 1000;
  } else if (displayName.includes('E2E') || process.env.JEST_TEST_TYPE === 'e2e') {
    cleanupDelay = 2000;
  }

  console.log('🧹 Global Jest teardown completed');

  // Force garbage collection if available
  performGarbageCollection();

  // Allow time for connections to close
  await delayForCleanup(cleanupDelay);
}
