/**
 * Jest Setup File (setupFiles)
 * Runs BEFORE module imports - required for module-level mocking
 */

// Import actual Prisma enums BEFORE any mocking to avoid initialization issues
// This ensures all enums (Role, SessionStatus, MessageType, etc.) are available
// without manual maintenance when new enums are added to the schema
const actualPrismaClient = jest.requireActual('@prisma/client');

import { setupTestEnvironment } from './setup/shared';
import { nodemailerMock, RedisService } from './utils/mocks';

// Set up common test environment variables
setupTestEnvironment({
  databaseSuffix: 'test',
  port: '3333',
  useStrictAssignment: true,
});

jest.mock('../src/app/redis/redis.service', () => ({ RedisService }));

function createMockRepository() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  };
}

jest.mock('@prisma/client', () => ({
  // Spread all actual exports (enums, types, etc.) to avoid manual maintenance
  ...actualPrismaClient,
  // Only override PrismaClient with a mock
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn().mockImplementation(callback => callback({})),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    $on: jest.fn(), // Event listener for query logging
    account: createMockRepository(),
    session: createMockRepository(),
    bookingType: createMockRepository(),
    timeSlot: createMockRepository(),
    message: createMockRepository(),
    discount: createMockRepository(),
    payment: createMockRepository(),
    refreshToken: createMockRepository(),
    notification: createMockRepository(),
    conversation: createMockRepository(),
    customService: createMockRepository(),
  })),
}));

jest.mock('nodemailer', () => nodemailerMock);
