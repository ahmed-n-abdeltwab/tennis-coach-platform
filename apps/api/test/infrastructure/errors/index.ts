/**
 * Test Infrastructure Error Utilities
 *
 * Provides custom error types for test infrastructure failures.
 * These errors provide better context when test setup or cleanup fails.
 *
 * Error types:
 * - TestInfrastructureError: Base error for all test infrastructure failures
 * - DatabaseError: Thrown for database-related failures
 * - TransactionError: Thrown for transaction-related failures
 * - AuthenticationError: Thrown for authentication-related failures
 * - HttpTestError: Thrown for HTTP test request failures
 * - FactoryError: Thrown for factory-related failures
 *
 * @example
 * ```typescript
 * import { createDatabaseError, isDatabaseError } from '@test-infrastructure/errors';
 *
 * try {
 *   await setupDatabase();
 * } catch (error) {
 *   throw createDatabaseError('setup database', error.message, { dbName: 'test' });
 * }
 * ```
 *
 * @module infrastructure/errors
 */

export * from './test-infrastructure-errors';
