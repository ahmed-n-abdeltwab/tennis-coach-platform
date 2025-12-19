/**
 * Shared console suppression utilities
 * Used across all test types to eliminate duplication
 */

/**
 * Suppresses console output during tests
 * Keeps warn and error for important messages
 * This eliminates duplication across unit.setup.ts, integration.setup.ts, and e2e.setup.ts
 */
export function suppressConsoleOutput(): void {
  global.console = {
    ...console,
    // Suppress verbose output
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    // Keep important messages
    warn: console.warn,
    error: console.error,
  };
}
