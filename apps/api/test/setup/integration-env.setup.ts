/**
 * Integration Test Environment Setup
 * Runs BEFORE module imports - sets up environment without mocking Prisma
 * Uses real Redis connection (not mocked)
 */

import { nodemailerMock } from '../utils/mocks';

import { setupTestEnvironment } from './shared';

// CRITICAL: Explicitly unmock @prisma/client to ensure real database connections
jest.unmock('@prisma/client');

// Set up common test environment variables
setupTestEnvironment({
  databaseSuffix: 'integration',
  port: '3334',
  useStrictAssignment: true,
});

// Note: Redis is NOT mocked for integration tests - uses real Redis connection
// The RedisService will connect to Redis db specified by REDIS_DB env var

jest.mock('nodemailer', () => nodemailerMock);
