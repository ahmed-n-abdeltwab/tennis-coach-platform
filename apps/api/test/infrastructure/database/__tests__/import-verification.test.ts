/**
 * Import Verification Test
 *
 * This test verifies that all database infrastructure utilities are properly exported
 * and can be imported from the correct locations.
 */

describe('Database Infrastructure Import Verification', () => {
  it('should export test database manager from infrastructure/database/index.ts', async () => {
    const databaseModule = await import('../index');

    expect(databaseModule.testDatabaseManager).toBeDefined();
  });

  it('should export batch cleanup manager from infrastructure/database/index.ts', async () => {
    const databaseModule = await import('../index');

    expect(databaseModule.batchCleanupManager).toBeDefined();
  });

  it('should export connection pool manager from infrastructure/database/index.ts', async () => {
    const databaseModule = await import('../index');

    expect(databaseModule.connectionPoolManager).toBeDefined();
  });

  it('should export database infrastructure from @test-infrastructure', async () => {
    const infrastructureModule = await import('../../index');

    // Verify managers are re-exported
    expect(infrastructureModule.testDatabaseManager).toBeDefined();
    expect(infrastructureModule.batchCleanupManager).toBeDefined();
  });

  it('should not export deprecated database helpers', async () => {
    const databaseModule = await import('../index');

    // These should NOT be exported (deprecated and removed)
    expect((databaseModule as Record<string, unknown>).cleanDatabase).toBeUndefined();
    expect((databaseModule as Record<string, unknown>).seedTestDatabase).toBeUndefined();
    expect((databaseModule as Record<string, unknown>).DatabaseSeeder).toBeUndefined();
    expect((databaseModule as Record<string, unknown>).createDatabaseSeeder).toBeUndefined();
  });

  it('should not export deprecated convenience functions', async () => {
    const databaseModule = await import('../index');

    // These should NOT be exported (deprecated and removed)
    expect(
      (databaseModule as Record<string, unknown>).setupTestDatabaseEnvironment
    ).toBeUndefined();
    expect((databaseModule as Record<string, unknown>).setupMinimalTestDatabase).toBeUndefined();
    expect(
      (databaseModule as Record<string, unknown>).setupComprehensiveTestDatabase
    ).toBeUndefined();
    expect((databaseModule as Record<string, unknown>).cleanupAllTestDatabases).toBeUndefined();
  });
});
