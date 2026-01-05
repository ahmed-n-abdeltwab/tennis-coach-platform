import { TestDatabaseManager, testDatabaseManager } from '../test-database-manager';

describe('TestDatabaseManager - Unit Tests', () => {
  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = TestDatabaseManager.getInstance();
      const instance2 = TestDatabaseManager.getInstance();
      const instance3 = TestDatabaseManager.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1).toBe(testDatabaseManager);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = TestDatabaseManager.getInstance();
      const instance2 = TestDatabaseManager.getInstance();

      // Both instances should reference the same object
      expect(instance1).toBe(instance2);
    });

    it('should export singleton instance', () => {
      const instance = TestDatabaseManager.getInstance();

      expect(testDatabaseManager).toBeDefined();
      expect(testDatabaseManager).toBe(instance);
    });
  });

  describe('Private Method Testing via Reflection', () => {
    let manager: TestDatabaseManager;

    beforeEach(() => {
      manager = TestDatabaseManager.getInstance();
    });

    describe('generateTestDatabaseName()', () => {
      it('should generate database name with correct format', () => {
        // Access private method through type assertion for testing
        const generateName = manager.generateTestDatabaseName.bind(manager);

        const dbName = generateName('my-test-suite', 'integration');

        // Should follow pattern: test_{type}_{testSuite}_{timestamp}_{random}
        expect(dbName).toMatch(/^test_integration_my_test_suite_\d+_[a-z0-9]+$/);
        expect(dbName).toContain('test_integration_');
        expect(dbName).toContain('my_test_suite');
      });

      it('should replace non-alphanumeric characters with underscores', () => {
        const generateName = manager.generateTestDatabaseName.bind(manager);

        const dbName = generateName('my-test@suite#123', 'unit');

        // Special characters should be replaced with underscores
        expect(dbName).toMatch(/^test_unit_my_test_suite_123_\d+_[a-z0-9]+$/);
        expect(dbName).not.toContain('@');
        expect(dbName).not.toContain('#');
        expect(dbName).not.toContain('-');
      });

      it('should include test type in database name', () => {
        const generateName = manager.generateTestDatabaseName.bind(manager);

        const unitDbName = generateName('suite', 'unit');
        const integrationDbName = generateName('suite', 'integration');
        const e2eDbName = generateName('suite', 'e2e');

        expect(unitDbName).toContain('test_unit_');
        expect(integrationDbName).toContain('test_integration_');
        expect(e2eDbName).toContain('test_e2e_');
      });

      it('should generate unique names for same test suite', () => {
        const generateName = manager.generateTestDatabaseName.bind(manager);

        const name1 = generateName('same-suite', 'integration');
        // Small delay to ensure different timestamp
        const name2 = generateName('same-suite', 'integration');

        // Names should be different due to timestamp and random component
        expect(name1).not.toBe(name2);
        expect(name1).toMatch(/^test_integration_same_suite_\d+_[a-z0-9]+$/);
        expect(name2).toMatch(/^test_integration_same_suite_\d+_[a-z0-9]+$/);
      });

      it('should handle empty test suite name', () => {
        const generateName = manager.generateTestDatabaseName.bind(manager);

        const dbName = generateName('', 'integration');

        // Should still generate valid name with just type, timestamp, and random
        expect(dbName).toMatch(/^test_integration__\d+_[a-z0-9]+$/);
      });

      it('should handle very long test suite names', () => {
        const generateName = manager.generateTestDatabaseName.bind(manager);

        const longName = 'a'.repeat(100);
        const dbName = generateName(longName, 'integration');

        // Should generate name without errors
        expect(dbName).toBeDefined();
        expect(dbName).toContain('test_integration_');
        expect(dbName).toContain('a'.repeat(100));
      });
    });

    describe('buildDatabaseUrl()', () => {
      it('should construct database URL correctly', () => {
        const buildUrl = manager.buildDatabaseUrl.bind(manager);

        const dbName = 'test_integration_suite_123_abc';
        const url = buildUrl(dbName);

        // Should append database name to base URL
        expect(url).toContain(dbName);
        expect(url).toMatch(/\/test_integration_suite_123_abc$/);
      });

      it('should use base URL from manager', () => {
        const buildUrl = manager.buildDatabaseUrl.bind(manager);
        const baseUrl = manager.getBaseUrl();

        const dbName = 'test_db';
        const url = buildUrl(dbName);

        // Should start with base URL
        expect(url).toBe(`${baseUrl}/${dbName}`);
      });

      it('should handle database names with special characters', () => {
        const buildUrl = manager.buildDatabaseUrl.bind(manager);

        const dbName = 'test_db_with_underscores';
        const url = buildUrl(dbName);

        expect(url).toContain(dbName);
        expect(url).toMatch(/\/test_db_with_underscores$/);
      });

      it('should not add extra slashes', () => {
        const buildUrl = manager.buildDatabaseUrl.bind(manager);

        const dbName = 'test_db';
        const url = buildUrl(dbName);

        // Should not have double slashes except in protocol
        const withoutProtocol = url.replace(/^[^:]+:\/\//, '');
        expect(withoutProtocol).not.toMatch(/\/\//);
      });
    });

    describe('extractBaseUrl()', () => {
      it('should extract base URL from full database URL', () => {
        const extractUrl = manager.extractBaseUrl.bind(manager);

        const fullUrl = 'postgresql://user:password@localhost:5432/mydb';
        const baseUrl = extractUrl(fullUrl);

        expect(baseUrl).toBe('postgresql://user:password@localhost:5432');
        expect(baseUrl).not.toContain('/mydb');
      });

      it('should handle URL with different protocols', () => {
        const extractUrl = manager.extractBaseUrl.bind(manager);

        const postgresUrl = 'postgresql://user:pass@host:5432/db';
        const postgresBaseUrl = extractUrl(postgresUrl);

        expect(postgresBaseUrl).toBe('postgresql://user:pass@host:5432');
      });

      it('should handle URL with special characters in password', () => {
        const extractUrl = manager.extractBaseUrl.bind(manager);

        const urlWithSpecialChars = 'postgresql://user:p@ss%23word@localhost:5432/db';
        const baseUrl = extractUrl(urlWithSpecialChars);

        expect(baseUrl).toBe('postgresql://user:p%40ss%23word@localhost:5432');
        expect(baseUrl).toContain('p%40ss%23word');
      });

      it('should handle URL without database name', () => {
        const extractUrl = manager.extractBaseUrl.bind(manager);

        const urlWithoutDb = 'postgresql://user:password@localhost:5432';
        const baseUrl = extractUrl(urlWithoutDb);

        expect(baseUrl).toBe('postgresql://user:password@localhost:5432');
      });

      it('should handle URL with custom port', () => {
        const extractUrl = manager.extractBaseUrl.bind(manager);

        const customPortUrl = 'postgresql://user:password@localhost:5433/db';
        const baseUrl = extractUrl(customPortUrl);

        expect(baseUrl).toBe('postgresql://user:password@localhost:5433');
        expect(baseUrl).toContain(':5433');
      });

      it('should handle URL with IP address', () => {
        const extractUrl = manager.extractBaseUrl.bind(manager);

        const ipUrl = 'postgresql://user:password@192.168.1.100:5432/db';
        const baseUrl = extractUrl(ipUrl);

        expect(baseUrl).toBe('postgresql://user:password@192.168.1.100:5432');
        expect(baseUrl).toContain('192.168.1.100');
      });

      it('should throw error for invalid URL format', () => {
        const extractUrl = manager.extractBaseUrl.bind(manager);

        const invalidUrl = 'not-a-valid-url';

        expect(() => extractUrl(invalidUrl)).toThrow('Invalid database URL');
      });

      it('should throw error for empty URL', () => {
        const extractUrl = manager.extractBaseUrl.bind(manager);

        expect(() => extractUrl('')).toThrow('Invalid database URL');
      });

      it('should handle URL with query parameters', () => {
        const extractUrl = manager.extractBaseUrl.bind(manager);

        const urlWithParams = 'postgresql://user:password@localhost:5432/db?schema=public';
        const baseUrl = extractUrl(urlWithParams);

        // Base URL should not include query parameters
        expect(baseUrl).toBe('postgresql://user:password@localhost:5432');
        expect(baseUrl).not.toContain('schema=public');
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid database URLs gracefully', () => {
        const extractUrl = manager.extractBaseUrl.bind(manager);

        const invalidUrls = ['invalid-url', '', 'http://', 'postgresql://'];

        invalidUrls.forEach(url => {
          expect(() => extractUrl(url)).toThrow();
        });
      });
    });

    describe('Integration with Environment', () => {
      it('should use DATABASE_URL from environment', () => {
        // The manager should have initialized with DATABASE_URL from process.env
        const baseUrl = manager.getBaseUrl();

        expect(baseUrl).toBeDefined();
        expect(typeof baseUrl).toBe('string');

        // Should be a valid URL format
        if (baseUrl) {
          expect(baseUrl).toMatch(/^postgresql:\/\//);
        }
      });
    });
  });
});
