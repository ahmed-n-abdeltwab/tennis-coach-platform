/**
 * Global teardown for all Jest test types
 * This file runs once after all tests complete
 */

export default async function globalTeardown(): Promise<void> {
  // Clean up any global resources
  console.log('🧹 Global Jest teardown completed');

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
}
