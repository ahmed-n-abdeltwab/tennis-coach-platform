/**
 * Import Verification Test
 *
 * This test verifies that all database utilities are properly exported
 * and can be imported from the correct locations.
 */

describe('Database Utilities Import Verification', () => {
  it('should export all database helpers from database/index.ts', async () => {
    const databaseModule = await import('../index');

    // Verify helper functions are exported
    expect(databaseModule.cleanDatabase).toBeDefined();
    expect(databaseModule.seedTestDatabase).toBeDefined();
    expect(databaseModule.withTransaction).toBeDefined();
    expect(databaseModule.cleanTable).toBeDefined();
    expect(databaseModule.countRecords).toBeDefined();
    expect(databaseModule.findRecord).toBeDefined();
    expect(databaseModule.findRecords).toBeDefined();
    expect(databaseModule.createRecord).toBeDefined();
    expect(databaseModule.updateRecord).toBeDefined();
    expect(databaseModule.deleteRecord).toBeDefined();
    expect(databaseModule.deleteRecords).toBeDefined();
    expect(databaseModule.recordExists).toBeDefined();
    expect(databaseModule.waitForRecord).toBeDefined();
    expect(databaseModule.executeRawQuery).toBeDefined();
    expect(databaseModule.resetSequences).toBeDefined();
  });

  it('should export DatabaseSeeder from database/index.ts', async () => {
    const databaseModule = await import('../index');

    expect(databaseModule.DatabaseSeeder).toBeDefined();
    expect(databaseModule.createDatabaseSeeder).toBeDefined();
  });

  it('should export test database manager from database/index.ts', async () => {
    const databaseModule = await import('../index');

    expect(databaseModule.testDatabaseManager).toBeDefined();
  });

  it('should export batch cleanup manager from database/index.ts', async () => {
    const databaseModule = await import('../index');

    expect(databaseModule.batchCleanupManager).toBeDefined();
  });

  it('should export convenience functions from database/index.ts', async () => {
    const databaseModule = await import('../index');

    expect(databaseModule.setupTestDatabaseEnvironment).toBeDefined();
    expect(databaseModule.setupMinimalTestDatabase).toBeDefined();
    expect(databaseModule.setupComprehensiveTestDatabase).toBeDefined();
    expect(databaseModule.cleanupAllTestDatabases).toBeDefined();
  });

  it('should export all database utilities from @test-utils', async () => {
    const testUtilsModule = await import('../../index');

    // Verify helper functions are re-exported
    expect(testUtilsModule.cleanDatabase).toBeDefined();
    expect(testUtilsModule.seedTestDatabase).toBeDefined();
    expect(testUtilsModule.DatabaseSeeder).toBeDefined();
    expect(testUtilsModule.createDatabaseSeeder).toBeDefined();
    expect(testUtilsModule.testDatabaseManager).toBeDefined();
    expect(testUtilsModule.batchCleanupManager).toBeDefined();
  });

  it('should export DatabaseMixin from @test-utils/base', async () => {
    const baseModule = await import('../../base');

    expect(baseModule.DatabaseMixin).toBeDefined();
  });
});
