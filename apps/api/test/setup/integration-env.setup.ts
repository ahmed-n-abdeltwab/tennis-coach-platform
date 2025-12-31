/**
 * Integration Test Environment Setup
 * Runs BEFORE module imports - sets up environment without mocking Prisma
 */

import { RedisService } from '../utils/mocks/redis.mock';

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

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      accepted: ['test@example.com'],
      rejected: [],
    }),
    verify: jest.fn().mockResolvedValue(true),
  }),
}));
