/**
 * Import Verification Test
 *
 * This test verifies that all database utilities are properly exported
 * and can be imported from the correct locations.
 */

describe('Database Utilities Import Verification', () => {
  it('should export test database manager from database/index.ts', async () => {
    const databaseModule = await import('../index');

    expect(databaseModule.testDatabaseManager).toBeDefined();
  });

  it('should export batch cleanup manager from database/index.ts', async () => {
    const databaseModule = await import('../index');

    expect(databaseModule.batchCleanupManager).toBeDefined();
  });

  it('should export connection pool manager from database/index.ts', async () => {
    const databaseModule = await import('../index');

    expect(databaseModule.connectionPoolManager).toBeDefined();
  });

  it('should export database utilities from @test-utils', async () => {
    const testUtilsModule = await import('../../index');

    // Verify managers are re-exported
    expect(testUtilsModule.testDatabaseManager).toBeDefined();
    expect(testUtilsModule.batchCleanupManager).toBeDefined();
  });

  it('should export DatabaseMixin from @test-utils/base', async () => {
    const baseModule = await import('../../base');

    expect(baseModule.DatabaseMixin).toBeDefined();
  });

  it('should not export deprecated database helpers', async () => {
    const databaseModule = await import('../index');

    // These should NOT be exported (deprecated and removed)
    expect(databaseModule.cleanDatabase).toBeUndefined();
    expect(databaseModule.seedTestDatabase).toBeUndefined();
    expect(databaseModule.DatabaseSeeder).toBeUndefined();
    expect(databaseModule.createDatabaseSeeder).toBeUndefined();
  });

  it('should not export deprecated convenience functions', async () => {
    const databaseModule = await import('../index');

    // These should NOT be exported (deprecated and removed)
    expect(databaseModule.setupTestDatabaseEnvironment).toBeUndefined();
    expect(databaseModule.setupMinimalTestDatabase).toBeUndefined();
    expect(databaseModule.setupComprehensiveTestDatabase).toBeUndefined();
    expect(databaseModule.cleanupAllTestDatabases).toBeUndefined();
  });
});
