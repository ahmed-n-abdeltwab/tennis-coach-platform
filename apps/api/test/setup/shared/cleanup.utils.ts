/**
 * Shared cleanup utilities
 * Used across all test types to eliminate duplication
 */

/**
 * Performs garbage collection if available
 * This eliminates duplication across global.teardown.ts, integration-global.teardown.ts, and e2e-global.teardown.ts
 */
export function performGarbageCollection(): void {
  if (global.gc) {
    global.gc();
  }
}

/**
 * Delays execution to allow resources to clean up
 * Useful in teardown to ensure connections are properly closed
 *
 * @param milliseconds - Delay duration in milliseconds
 */
export async function delayForCleanup(milliseconds: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, milliseconds));
}
