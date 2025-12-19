/**
 * Global teardown for e2e tests
 * This file runs once after all e2e tests complete
 */

import { delayForCleanup, performGarbageCollection } from './shared';

export default async function e2eGlobalTeardown(): Promise<void> {
  console.log('🧹 E2E tests global teardown completed');

  // Force garbage collection if available
  performGarbageCollection();

  // Allow time for connections to close
  await delayForCleanup(2000);
}
