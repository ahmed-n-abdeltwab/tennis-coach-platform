/**
 * Global teardown for integration tests
 * This file runs once after all integration tests complete
 */

export default async function integrationGlobalTeardown(): Promise<void> {
  console.log('🧹 Integration tests global teardown completed');

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Allow time for connections to close
  await new Promise(resolve => setTimeout(resolve, 1000));
}
