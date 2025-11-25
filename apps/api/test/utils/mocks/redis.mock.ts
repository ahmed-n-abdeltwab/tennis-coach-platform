/**
 * Mock Redis Service for Testing
 * Provides an in-memory implementation of Redis for tests
 */

export class MockRedisService {
  private store: Map<string, { value: string; expiry?: number }> = new Map();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;

    // Check if expired
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key: string, value: string, ...args: any[]): Promise<'OK'> {
    let expiry: number | undefined;

    // Handle 'EX' flag for TTL in seconds
    if (args[0] === 'EX' && typeof args[1] === 'number') {
      expiry = Date.now() + args[1] * 1000;
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

  // Clear all data (useful for test cleanup)
  clear(): void {
    this.store.clear();
  }

  // Get all keys (useful for debugging)
  keys(): string[] {
    return Array.from(this.store.keys());
  }
}

/**
 * Factory function to create a mock Redis provider
 */
export const createMockRedisProvider = () => ({
  provide: 'RedisService',
  useValue: new MockRedisService(),
});
