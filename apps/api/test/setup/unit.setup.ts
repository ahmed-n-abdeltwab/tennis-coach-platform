/**
 * Unit Test Setup (setupFilesAfterEnv)
 * Runs AFTER Jest environment is set up, before each test file
 *
 * This file handles:
 * - Test lifecycle hooks (beforeEach/afterEach)
 * - Console output suppression
 *
 * Module-level mocks (Prisma, Redis, nodemailer) are in setup.ts
 * Mock factories for use in tests are in MockMixin (test/utils/base/mixins/mock.mixin.ts)
 */

import { suppressConsoleOutput } from './shared';

// =============================================================================
// Test Lifecycle Hooks
// =============================================================================

beforeEach(() => {
  // Clear all mocks before each test for isolation
  jest.clearAllMocks();
});

afterEach(() => {
  // Restore any spied methods to original implementations
  jest.restoreAllMocks();
});

// =============================================================================
// Console Output
// =============================================================================

// Suppress console output in unit tests to keep test output clean
suppressConsoleOutput();
