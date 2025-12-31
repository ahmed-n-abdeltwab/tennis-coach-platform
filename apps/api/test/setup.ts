/**
 * Jest Setup File (setupFiles)
 * Runs BEFORE module imports - required for module-level mocking
 *
 * IMPORTANT: Cannot import from project files here as they haven't loaded yet.
 * All mocks must be defined inline. For mock factories used in tests,
 * see MockMixin in test/utils/base/mixins/mock.mixin.ts
 */

import { setupTestEnvironment } from './setup/shared';

// Set up common test environment variables
setupTestEnvironment({
  databaseSuffix: 'test',
  port: '3333',
  useStrictAssignment: true,
});

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

jest.mock('../src/app/redis/redis.service', () => {
  // Inline MockRedisService - must match @test-infrastructure/redis/MockRedisService
  class MockRedisService {
    private store: Map<string, { value: string; expiry?: number }> = new Map();

    async get(key: string): Promise<string | null> {
      const item = this.store.get(key);
      if (!item) return null;
      if (item.expiry && Date.now() > item.expiry) {
        this.store.delete(key);
        return null;
      }
      return item.value;
    }

    async set(key: string, value: string, flag?: string, ttl?: number): Promise<'OK'> {
      let expiry: number | undefined;
      if (flag === 'EX' && typeof ttl === 'number') {
        expiry = Date.now() + ttl * 1000;
      }
      this.store.set(key, { value, expiry });
      return 'OK';
    }

    async validate(key: string, value: string): Promise<boolean> {
      const storedValue = await this.get(key);
      return value === storedValue;
    }

    async invalidate(key: string): Promise<void> {
      this.store.delete(key);
    }

    async del(key: string): Promise<number> {
      const existed = this.store.has(key);
      this.store.delete(key);
      return existed ? 1 : 0;
    }

    async ping(): Promise<string> {
      return 'PONG';
    }

    async quit(): Promise<'OK'> {
      this.store.clear();
      return 'OK';
    }

    getClient() {
      return this;
    }

    clear(): void {
      this.store.clear();
    }

    keys(): string[] {
      return Array.from(this.store.keys());
    }
  }

  return {
    RedisService: MockRedisService,
  };
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    verify: jest.fn().mockResolvedValue(true),
  })),
}));
