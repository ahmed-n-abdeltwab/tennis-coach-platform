/**
 * Test Infrastructure Constants
 *
 * Configuration and technical constants for test utilities.
 * For test data generation, use factories from @test-utils/factories instead.
 */

// JWT Constants
export const JWT_CONSTANTS = {
  DEFAULT_SECRET: 'test-secret',
  DEFAULT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-minimum-32-chars',
  DEFAULT_EXPIRY: '1h',
  DEFAULT_REFRESH_EXPIRY: '7d',
} as const;

// Transaction Constants
export const TRANSACTION_CONSTANTS = {
  DEFAULT_TIMEOUT_MS: 30000,
  DEFAULT_MAX_WAIT_MS: 5000,
} as const;

// Database Constants
export const DATABASE_CONSTANTS = {
  ADMIN_DATABASE: 'postgres',
  CONNECTION_TIMEOUT_MS: 10000,
  MIGRATION_TIMEOUT_MS: 30000,
  SCHEMA_PATH: './apps/api/prisma/schema.prisma',
} as const;

// Test Environment Constants
export const TEST_ENV_CONSTANTS = {
  REQUIRED_ENV: 'test',
} as const;

// HTTP Constants
export const HTTP_CONSTANTS = {
  BEARER_PREFIX: 'Bearer ',
  AUTHORIZATION_HEADER: 'Authorization',
} as const;

// Error Message Templates
export const ERROR_MESSAGES = {
  NO_PRISMA_CLIENT:
    'No Prisma client found. Ensure your test class has a "prisma" or "client" property.',
  INVALID_ENVIRONMENT: 'TestDatabaseManager can only be used in test environment',
  NO_DATABASE_CONNECTION: 'No test database connection found',
  TABLE_NOT_FOUND: 'Table not found in Prisma schema',
  CONNECTION_TIMEOUT: 'Connection timeout',
  INVALID_DATABASE_URL: 'Invalid database URL format',
} as const;

// URL Truncation for Security
export const SECURITY_CONSTANTS = {
  URL_TRUNCATE_LENGTH: 30,
} as const;
