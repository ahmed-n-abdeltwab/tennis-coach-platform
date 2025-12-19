/**
 * Global teardown for integration tests
 * This file runs once after all integration tests complete
 */

import { delayForCleanup, performGarbageCollection } from './shared';

export default async function integrationGlobalTeardown(): Promise<void> {
  console.log('🧹 Integration tests global teardown completed');

  // Force garbage collection if available
  performGarbageCollection();

  // Allow time for connections to close
  await delayForCleanup(1000);
}
