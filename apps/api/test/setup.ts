// Set NODE_ENV to test for all tests
process.env.NODE_ENV = 'test';

// Ensure DATABASE_URL is set for test database manager
// If not set, use a default test database URL
process.env.DATABASE_URL ??=
  'postgresql://postgres:password@localhost:5432/tennis_coach_test?connection_limit=5&pool_timeout=2';

// Mock Redis to prevent connection issues in tests
jest.mock('../src/app/redis/redis.service', () => {
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

    async set(key: string, value: string, ...args: any[]): Promise<'OK'> {
      let expiry: number | undefined;
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
  }

  return {
    RedisService: MockRedisService,
  };
});
