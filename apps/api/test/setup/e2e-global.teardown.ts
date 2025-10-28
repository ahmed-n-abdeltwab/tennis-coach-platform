/**
 * Global teardown for e2e tests
 * This file runs once after all e2e tests complete
 */

export default async function e2eGlobalTeardown(): Promise<void> {
  console.log('🧹 E2E tests global teardown completed');

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Allow time for connections to close
  await new Promise(resolve => setTimeout(resolve, 2000));
}
