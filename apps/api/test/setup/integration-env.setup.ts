/**
 * Integration Test Environment Setup
 * Runs BEFORE module imports - sets up environment without mocking Prisma
 */

import { nodemailerMock, RedisService } from '../utils/mocks';

import { setupTestEnvironment } from './shared';

// CRITICAL: Explicitly unmock @prisma/client to ensure real database connections
jest.unmock('@prisma/client');

// Set up common test environment variables
setupTestEnvironment({
  databaseSuffix: 'integration',
  port: '3334',
  useStrictAssignment: true,
});

jest.mock('../../src/app/redis/redis.service', () => ({ RedisService }));

jest.mock('nodemailer', () => nodemailerMock);
