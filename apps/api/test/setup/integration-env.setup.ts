/**
 * Integration Test Environment Setup
 * Runs BEFORE module imports - sets up environment without mocking Prisma
 *
 * Unlike setup.ts, this does NOT mock @prisma/client because integration tests
 * need the real database connection.
 */

import { setupTestEnvironment } from './shared';

// CRITICAL: Explicitly unmock @prisma/client to ensure real database connections
// This must be called before any imports that use Prisma
jest.unmock('@prisma/client');

// Set up common test environment variables
setupTestEnvironment({
  databaseSuffix: 'integration',
  port: '3334',
  useStrictAssignment: true,
});

// =============================================================================
// Mock: RedisService (still needed for integration tests)
// Prevents actual Redis connections
// =============================================================================
jest.mock('../../src/app/redis/redis.service', () => {
  class MockRedisService {
    private store: Map<string, { value: string; expiry?: number }> = new Map();

    async set(key: string, value: string, ...args: unknown[]): Promise<'OK'> {
      let expiry: number | undefined;
      if (args[0] === 'EX' && typeof args[1] === 'number') {
        expiry = Date.now() + (args[1] as number) * 1000;
      }
      this.store.set(key, { value, expiry });
      return 'OK';
    }

    async get(key: string): Promise<string | null> {
      const item = this.store.get(key);
      if (!item) return null;
      if (item.expiry && Date.now() > item.expiry) {
        this.store.delete(key);
        return null;
      }
      return item.value;
    }

    async del(key: string): Promise<number> {
      const existed = this.store.has(key);
      this.store.delete(key);
      return existed ? 1 : 0;
    }

    async validate(key: string, value: string): Promise<boolean> {
      const stored = await this.get(key);
      return stored === value;
    }

    async invalidate(key: string): Promise<void> {
      this.store.delete(key);
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
  }

  return {
    RedisService: MockRedisService,
  };
});

// =============================================================================
// Mock: nodemailer (still needed for integration tests)
// Prevents actual email sending
// =============================================================================
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
