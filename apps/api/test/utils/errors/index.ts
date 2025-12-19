/**
 * Test Infrastructure Error Utilities
 *
 * Provides custom error types for test infrastructure failures.
 * These errors provide better context when test setup or cleanup fails.
 *
 * Error types:
 * - TestInfrastructureError: Base error for all test infrastructure failures
 * - TestSetupError: Thrown during test setup phase
 * - TestCleanupError: Thrown during test cleanup phase
 * - TestDatabaseError: Thrown for database-related failures
 * - TestAuthenticationError: Thrown for authentication-related failures
 *
 * @example
 * ```typescript
 * import { TestSetupError, TestCleanupError } from '@test-utils/errors';
 *
 * try {
 *   await setupDatabase();
 * } catch (error) {
 *   throw new TestSetupError('Failed to initialize database', error);
 * }
 * ```
 *
 * @module errors
 */

export * from './test-infrastructure-errors';
