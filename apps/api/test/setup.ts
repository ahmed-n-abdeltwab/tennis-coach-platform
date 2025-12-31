/**
 * Jest Setup File (setupFiles)
 * Runs BEFORE module imports - required for module-level mocking
 */

import { setupTestEnvironment } from './setup/shared';
import { RedisService } from './utils/mocks/redis.mock';

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
  })),
  // Prisma enums - must be included for type checking
  Role: {
    USER: 'USER',
    COACH: 'COACH',
    ADMIN: 'ADMIN',
    PREMIUM_USER: 'PREMIUM_USER',
  },
  SessionStatus: {
    SCHEDULED: 'SCHEDULED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    NO_SHOW: 'NO_SHOW',
  },
  PaymentStatus: {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED',
  },
  DiscountType: {
    PERCENTAGE: 'PERCENTAGE',
    FIXED: 'FIXED',
  },
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    verify: jest.fn().mockResolvedValue(true),
  })),
}));
