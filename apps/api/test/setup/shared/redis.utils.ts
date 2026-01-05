/**
 * Redis test utilities
 * Handles Redis connection, cleanup, and health checks for integration/e2e tests
 */

import Redis from 'ioredis';

/**
 * Creates a Redis client for test setup/teardown
 * Uses environment variables for configuration
 */
export function createTestRedisClient(): Redis {
  return new Redis({
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD,
    db: Number(process.env.REDIS_DB ?? 0),
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 3) return null;
      return Math.min(times * 100, 1000);
    },
  });
}

/**
 * Ensures Redis is ready for tests
 * Pings Redis and flushes the test database
 */
export async function ensureRedisReady(): Promise<void> {
  const client = createTestRedisClient();

  try {
    // Test connection
    const pong = await client.ping();
    if (pong !== 'PONG') {
      throw new Error(`Redis ping failed: ${pong}`);
    }

    // Flush the test database to ensure clean state
    await client.flushdb();

    // eslint-disable-next-line no-console
    console.log(`✅ Redis ready (db: ${process.env.REDIS_DB ?? 0})`);
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  } finally {
    await client.quit();
  }
}

/**
 * Cleans up Redis test database
 * Flushes all keys in the test database
 */
export async function cleanupRedis(): Promise<void> {
  const client = createTestRedisClient();

  try {
    await client.flushdb();
    // eslint-disable-next-line no-console
    console.log(`🗑️  Flushed Redis db: ${process.env.REDIS_DB ?? 0}`);
  } catch (error) {
    console.error('❌ Redis cleanup failed:', error);
  } finally {
    await client.quit();
  }
}

/**
 * Checks if Redis is available
 * Returns true if Redis responds to ping, false otherwise
 */
export async function isRedisAvailable(): Promise<boolean> {
  const client = createTestRedisClient();

  try {
    const pong = await client.ping();
    return pong === 'PONG';
  } catch {
    return false;
  } finally {
    await client.quit();
  }
}
