/**
 * RedisService Unit Tests
 *
 * These tests verify the in-memory Redis mock implementation used in unit tests.
 * The mock is defined in test/utils/mocks/redis.mock.ts and auto-injected via setup.ts.
 *
 * For integration tests with a real Redis instance, see redis.integration.spec.ts
 */
import { RedisService } from './redis.service';

// The mock from setup.ts provides additional methods not on the real service
interface MockRedisService extends RedisService {
  clear(): void;
  keys(): string[];
  del(key: string): Promise<number>;
  ping(): Promise<string>;
  quit(): Promise<'OK'>;
}

describe('RedisService', () => {
  let service: MockRedisService;

  beforeEach(() => {
    // The global mock from setup.ts provides an in-memory implementation
    // The mock class doesn't require constructor arguments

    service = new (RedisService as any)() as MockRedisService;
  });

  afterEach(() => {
    // Clear the in-memory store between tests
    service.clear();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('get', () => {
    it('should return null for non-existing key', async () => {
      const result = await service.get('non-existing-key');

      expect(result).toBeNull();
    });

    it('should return value for existing key', async () => {
      const key = 'test-key';
      const value = 'test-value';
      await service.set(key, value);

      const result = await service.get(key);

      expect(result).toBe(value);
    });

    it('should return null for expired key', async () => {
      const key = 'expiring-key';
      const value = 'test-value';
      // Set with 1 second TTL - mock uses (key, value, 'EX', ttl) signature
      await (
        service as unknown as { set(k: string, v: string, f: string, t: number): Promise<'OK'> }
      ).set(key, value, 'EX', 1);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100));

      const result = await service.get(key);

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';

      const result = await service.set(key, value);

      expect(result).toBe('OK');
      expect(await service.get(key)).toBe(value);
    });

    it('should set value with TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 3600;

      const result = await service.set(key, value, ttl);

      expect(result).toBe('OK');
      expect(await service.get(key)).toBe(value);
    });

    it('should overwrite existing value', async () => {
      const key = 'test-key';
      await service.set(key, 'old-value');

      await service.set(key, 'new-value');

      expect(await service.get(key)).toBe('new-value');
    });
  });

  describe('validate', () => {
    it('should return true when value matches', async () => {
      const key = 'test-key';
      const value = 'test-value';
      await service.set(key, value);

      const result = await service.validate(key, value);

      expect(result).toBe(true);
    });

    it('should return false when value does not match', async () => {
      const key = 'test-key';
      await service.set(key, 'stored-value');

      const result = await service.validate(key, 'different-value');

      expect(result).toBe(false);
    });

    it('should return false when key does not exist', async () => {
      const result = await service.validate('non-existing-key', 'test-value');

      expect(result).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should delete key from store', async () => {
      const key = 'test-key';
      await service.set(key, 'test-value');

      await service.invalidate(key);

      expect(await service.get(key)).toBeNull();
    });

    it('should not throw when key does not exist', async () => {
      await expect(service.invalidate('non-existing-key')).resolves.not.toThrow();
    });
  });

  describe('del', () => {
    it('should return 1 when key existed', async () => {
      const key = 'test-key';
      await service.set(key, 'test-value');

      const result = await service.del(key);

      expect(result).toBe(1);
      expect(await service.get(key)).toBeNull();
    });

    it('should return 0 when key did not exist', async () => {
      const result = await service.del('non-existing-key');

      expect(result).toBe(0);
    });
  });

  describe('ping', () => {
    it('should return PONG', async () => {
      const result = await service.ping();

      expect(result).toBe('PONG');
    });
  });

  describe('quit', () => {
    it('should clear store and return OK', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');

      const result = await service.quit();

      expect(result).toBe('OK');
      expect(await service.get('key1')).toBeNull();
      expect(await service.get('key2')).toBeNull();
    });
  });

  describe('getClient', () => {
    it('should return the service instance', () => {
      const client = service.getClient();

      expect(client).toBe(service);
    });
  });

  describe('clear', () => {
    it('should clear all keys', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');

      service.clear();

      expect(await service.get('key1')).toBeNull();
      expect(await service.get('key2')).toBeNull();
    });
  });

  describe('keys', () => {
    it('should return all stored keys', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');

      const keys = service.keys();

      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should return empty array when no keys', () => {
      const keys = service.keys();

      expect(keys).toHaveLength(0);
    });
  });
});
