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
// NOTE: This implementation must be inline because jest.mock runs before imports.
// The canonical MockRedisService is in @test-infrastructure (apps/api/test/infrastructure/redis/index.ts)
// Keep this implementation in sync with the canonical version.
// =============================================================================
jest.mock('../../src/app/redis/redis.service', () => {
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
