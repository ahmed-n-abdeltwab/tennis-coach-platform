// Set NODE_ENV to test for all tests
process.env.NODE_ENV = 'test';

// Ensure DATABASE_URL is set for test database manager
// If not set, use a default test database URL
process.env.DATABASE_URL ??=
  'postgresql://postgres:password@localhost:5432/tennis_coach_test?connection_limit=5&pool_timeout=2';

// Set required environment variables for validation
process.env.JWT_SECRET ??= 'test-jwt-secret-key-minimum-32-characters';
process.env.JWT_EXPIRES_IN ??= '1h';
process.env.JWT_REFRESH_SECRET ??= 'test-jwt-refresh-secret-key-minimum-32-characters';
process.env.JWT_REFRESH_EXPIRES_IN ??= '7d';
process.env.BCRYPT_SALT_ROUNDS ??= '4';

// PayPal configuration
process.env.PAYPAL_CLIENT_ID ??= 'test-paypal-client-id';
process.env.PAYPAL_CLIENT_SECRET ??= 'test-paypal-client-secret';
process.env.PAYPAL_ENVIRONMENT ??= 'sandbox';

// Google OAuth configuration
process.env.GOOGLE_CLIENT_ID ??= 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET ??= 'test-google-client-secret';
process.env.GOOGLE_REDIRECT_URI ??= 'http://localhost:3333/auth/google/callback';

// Email configuration
process.env.SMTP_SENDER_EMAIL ??= 'test@example.com';
process.env.SMTP_TOKEN ??= 'test-token';

// App configuration
process.env.PORT ??= '3333';
process.env.FRONTEND_URL ??= 'http://localhost:4200';
process.env.npm_package_version ??= '1.0.0';
process.env.LOG_LEVEL ??= 'error';

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
