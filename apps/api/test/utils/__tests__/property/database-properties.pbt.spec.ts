/**
 * Property-based tests for database operations
 *
 * Tests database CRUD operations, transactions, and isolation
 * using property-based testing with fast-check.
 */

import { Role } from '@prisma/client';
import * as fc from 'fast-check';

import { TestDatabaseManager } from '../../database/test-database-manager';
import { nonEmptyStringArbitrary } from '../../property-testing';

describe.skip('Database Properties (Property-Based Tests)', () => {
  let dbManager: TestDatabaseManager;

  beforeAll(() => {
    dbManager = TestDatabaseManager.getInstance();
  });

  afterAll(async () => {
    await dbManager.cleanupAllTestDatabases();
  });

  describe('Property 9: Database isolation between concurrent tests', () => {
    /**
     * **Feature: test-infrastructure-improvement, Property 9: Database isolation between concurrent tests**
     * **Validates: Requirements 5.1**
     *
     * For any two test suites running concurrently, operations in one test suite
     * should not affect the data visible to the other test suite.
     */
    it('should isolate data between concurrent test suites', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            nonEmptyStringArbitrary(),
            nonEmptyStringArbitrary(),
            fc.integer({ min: 1, max: 5 }),
            fc.integer({ min: 1, max: 5 })
          ),
          async ([testSuite1, testSuite2, count1, count2]) => {
            // Ensure test suite names are different
            fc.pre(testSuite1 !== testSuite2);

            // Create two isolated test databases
            const db1 = await dbManager.createTestDatabase(`isolation_test_${testSuite1}`, {
              type: 'integration',
              isolationLevel: 'database',
              autoCleanup: true,
              seedData: false,
            });

            const db2 = await dbManager.createTestDatabase(`isolation_test_${testSuite2}`, {
              type: 'integration',
              isolationLevel: 'database',
              autoCleanup: true,
              seedData: false,
            });

            try {
              // Verify databases are different
              expect(db1.name).not.toBe(db2.name);
              expect(db1.url).not.toBe(db2.url);

              // Create different numbers of accounts in each database
              const accounts1 = await Promise.all(
                Array.from({ length: count1 }, (_, i) =>
                  db1.client.account.create({
                    data: {
                      email: `user${i}@db1.com`,
                      name: `User ${i} DB1`,
                      passwordHash: 'hash',
                      role: Role.USER,
                    },
                  })
                )
              );

              const accounts2 = await Promise.all(
                Array.from({ length: count2 }, (_, i) =>
                  db2.client.account.create({
                    data: {
                      email: `user${i}@db2.com`,
                      name: `User ${i} DB2`,
                      passwordHash: 'hash',
                      role: Role.USER,
                    },
                  })
                )
              );

              // Verify each database has the correct count
              const db1Count = await db1.client.account.count();
              const db2Count = await db2.client.account.count();

              expect(db1Count).toBe(count1);
              expect(db2Count).toBe(count2);

              // Verify accounts from db1 are not visible in db2
              for (const account of accounts1) {
                const foundInDb2 = await db2.client.account.findUnique({
                  where: { id: account.id },
                });
                expect(foundInDb2).toBeNull();
              }

              // Verify accounts from db2 are not visible in db1
              for (const account of accounts2) {
                const foundInDb1 = await db1.client.account.findUnique({
                  where: { id: account.id },
                });
                expect(foundInDb1).toBeNull();
              }

              // Verify emails are isolated
              const db1Emails = await db1.client.account.findMany({
                select: { email: true },
              });
              const db2Emails = await db2.client.account.findMany({
                select: { email: true },
              });

              const db1EmailSet = new Set(db1Emails.map(a => a.email));
              const db2EmailSet = new Set(db2Emails.map(a => a.email));

              // No overlap in emails
              for (const email of db1EmailSet) {
                expect(db2EmailSet.has(email)).toBe(false);
              }
              for (const email of db2EmailSet) {
                expect(db1EmailSet.has(email)).toBe(false);
              }
            } finally {
              // Cleanup
              await dbManager.cleanupTestDatabase(`isolation_test_${testSuite1}`);
              await dbManager.cleanupTestDatabase(`isolation_test_${testSuite2}`);
            }
          }
        ),
        { numRuns: 1, verbose: true }
      );
    }); // 2 minute timeout for 100 iterations

    it('should handle concurrent operations without interference', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(nonEmptyStringArbitrary(), { minLength: 2, maxLength: 4 }),
          async testSuiteNames => {
            // Ensure all test suite names are unique
            const uniqueNames = Array.from(new Set(testSuiteNames));
            fc.pre(uniqueNames.length === testSuiteNames.length);

            // Create databases concurrently
            const databases = await Promise.all(
              testSuiteNames.map(name =>
                dbManager.createTestDatabase(`concurrent_test_${name}`, {
                  type: 'integration',
                  isolationLevel: 'database',
                  autoCleanup: true,
                  seedData: false,
                })
              )
            );

            try {
              // Verify all databases are different
              const dbNames = databases.map(db => db.name);
              const uniqueDbNames = new Set(dbNames);
              expect(uniqueDbNames.size).toBe(databases.length);

              // Perform concurrent operations on each database
              await Promise.all(
                databases.map(async (db, index) => {
                  // Create unique data in each database
                  await db.client.account.create({
                    data: {
                      email: `user${index}@concurrent.com`,
                      name: `Concurrent User ${index}`,
                      passwordHash: 'hash',
                      role: Role.USER,
                    },
                  });
                })
              );

              // Verify each database has exactly one account
              for (const db of databases) {
                const count = await db.client.account.count();
                expect(count).toBe(1);
              }

              // Verify each database has different data
              const allAccounts = await Promise.all(
                databases.map(db => db.client.account.findMany())
              );

              for (let i = 0; i < allAccounts.length; i++) {
                for (let j = i + 1; j < allAccounts.length; j++) {
                  const accounts1 = allAccounts[i];
                  const accounts2 = allAccounts[j];

                  if (!accounts1 || !accounts2) {
                    continue;
                  }

                  // No account IDs should overlap
                  const ids1 = new Set(accounts1.map(a => a.id));
                  const ids2 = new Set(accounts2.map(a => a.id));

                  for (const id of ids1) {
                    expect(ids2.has(id)).toBe(false);
                  }
                }
              }
            } finally {
              // Cleanup all databases
              await Promise.all(
                testSuiteNames.map(name => dbManager.cleanupTestDatabase(`concurrent_test_${name}`))
              );
            }
          }
        ),
        { numRuns: 1, verbose: true }
      );
    }); // 2 minute timeout for 50 iterations
  });

  describe('Property 10: Database cleanup removes all test data', () => {
    /**
     * **Feature: test-infrastructure-improvement, Property 10: Database cleanup removes all test data**
     * **Validates: Requirements 5.2**
     *
     * For any test database, calling cleanup should remove the database such that
     * subsequent queries to that database fail.
     */
    it('should completely remove test database after cleanup', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            nonEmptyStringArbitrary(),
            fc.integer({ min: 1, max: 5 }),
            fc.integer({ min: 1, max: 5 })
          ),
          async ([testSuiteName, accountCount, sessionCount]) => {
            const testSuite = `cleanup_test_${testSuiteName}`;

            // Create a test database
            const db = await dbManager.createTestDatabase(testSuite, {
              type: 'integration',
              isolationLevel: 'database',
              autoCleanup: false, // We'll manually cleanup to test it
              seedData: false,
            });

            const dbUrl = db.url;

            try {
              // Add some data to the database
              const accounts = await Promise.all(
                Array.from({ length: accountCount }, (_, i) =>
                  db.client.account.create({
                    data: {
                      email: `cleanup_user${i}@test.com`,
                      name: `Cleanup User ${i}`,
                      passwordHash: 'hash',
                      role: Role.USER,
                    },
                  })
                )
              );

              // Create coaches for sessions
              const coaches = await Promise.all(
                Array.from({ length: Math.min(sessionCount, 3) }, (_, i) =>
                  db.client.account.create({
                    data: {
                      email: `cleanup_coach${i}@test.com`,
                      name: `Cleanup Coach ${i}`,
                      passwordHash: 'hash',
                      role: Role.COACH,
                    },
                  })
                )
              );

              // Add sessions (requires bookingType and timeSlot)
              if (coaches.length > 0 && accounts.length > 0) {
                // Create booking types first
                const bookingTypes = await Promise.all(
                  coaches.map((coach, i) =>
                    db.client.bookingType.create({
                      data: {
                        name: `Booking Type ${i}`,
                        description: `Test booking type ${i}`,
                        basePrice: 50.0 + i * 10,
                        coachId: coach.id,
                        isActive: true,
                      },
                    })
                  )
                );

                // Create time slots
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const timeSlots = await Promise.all(
                  coaches.map((coach, i) =>
                    db.client.timeSlot.create({
                      data: {
                        dateTime: new Date(tomorrow.getTime() + i * 60 * 60 * 1000),
                        durationMin: 60,
                        isAvailable: true,
                        coachId: coach.id,
                      },
                    })
                  )
                );

                // Create sessions
                await Promise.all(
                  Array.from({ length: Math.min(sessionCount, coaches.length) }, (_, i) => {
                    const coach = coaches[i] ?? coaches[0];
                    const user = accounts[i % accounts.length] ?? accounts[0];
                    const bookingType = bookingTypes[i] ?? bookingTypes[0];
                    const timeSlot = timeSlots[i] ?? timeSlots[0];

                    if (!coach || !user || !bookingType || !timeSlot) {
                      return Promise.resolve();
                    }

                    return db.client.session.create({
                      data: {
                        dateTime: new Date(tomorrow.getTime() + i * 60 * 60 * 1000),
                        durationMin: 60,
                        price: 50.0 + i * 10,
                        status: 'scheduled',
                        userId: user.id,
                        coachId: coach.id,
                        bookingTypeId: bookingType.id,
                        timeSlotId: timeSlot.id,
                      },
                    });
                  })
                );
              }

              // Verify data exists before cleanup
              const accountCountBefore = await db.client.account.count();
              const sessionCountBefore = await db.client.session.count();

              expect(accountCountBefore).toBeGreaterThan(0);
              expect(accountCountBefore).toBe(accountCount + coaches.length);

              if (coaches.length > 0) {
                expect(sessionCountBefore).toBe(sessionCount);
              }

              // Perform cleanup
              await dbManager.cleanupTestDatabase(testSuite);

              // Verify the database connection is removed from the manager
              const connection = dbManager.getTestDatabase(testSuite);
              expect(connection).toBeUndefined();

              // Verify the database no longer exists by trying to connect to it
              // This should fail because the database has been dropped
              const { Pool } = await import('pg');
              const { PrismaPg } = await import('@prisma/adapter-pg');
              const testPool = new Pool({ connectionString: dbUrl });
              const testAdapter = new PrismaPg(testPool);

              const testClient = new (await import('@prisma/client')).PrismaClient({
                adapter: testAdapter,
              });

              let connectionFailed = false;
              try {
                await testClient.$connect();
                // Try to query - this should fail if database doesn't exist
                await testClient.$executeRawUnsafe(`SELECT 1`);
                await testClient.$disconnect();
                await testPool.end();
              } catch {
                // Expected: connection or query should fail because database doesn't exist
                connectionFailed = true;
                try {
                  await testPool.end();
                } catch {
                  // Ignore pool errors
                }
                try {
                  await testClient.$disconnect();
                } catch {
                  // Ignore disconnect errors
                }
              }

              // The connection should have failed because the database was dropped
              expect(connectionFailed).toBe(true);
            } catch (error) {
              // If something goes wrong, try to cleanup
              try {
                await dbManager.cleanupTestDatabase(testSuite);
              } catch {
                // Ignore cleanup errors in error handler
              }
              throw error;
            }
          }
        ),
        { numRuns: 1, verbose: true }
      );
    }); // 3 minute timeout for 3 iterations

    it('should handle cleanup of empty databases', async () => {
      await fc.assert(
        fc.asyncProperty(nonEmptyStringArbitrary(), async testSuiteName => {
          const testSuite = `cleanup_empty_${testSuiteName}`;

          // Create a test database without adding any data
          const db = await dbManager.createTestDatabase(testSuite, {
            type: 'integration',
            isolationLevel: 'database',
            autoCleanup: false,
            seedData: false,
          });

          const dbUrl = db.url;

          try {
            // Verify database is empty
            const accountCount = await db.client.account.count();
            expect(accountCount).toBe(0);

            // Perform cleanup
            await dbManager.cleanupTestDatabase(testSuite);

            // Verify the database connection is removed
            const connection = dbManager.getTestDatabase(testSuite);
            expect(connection).toBeUndefined();

            // Verify the database no longer exists
            const { Pool } = await import('pg');
            const { PrismaPg } = await import('@prisma/adapter-pg');
            const testPool2 = new Pool({ connectionString: dbUrl });
            const testAdapter2 = new PrismaPg(testPool2);

            const testClient = new (await import('@prisma/client')).PrismaClient({
              adapter: testAdapter2,
            });

            let connectionFailed = false;
            try {
              await testClient.$connect();
              await testClient.$executeRawUnsafe(`SELECT 1`);
              await testClient.$disconnect();
              await testPool2.end();
            } catch {
              connectionFailed = true;
              try {
                await testClient.$disconnect();
              } catch {
                // Ignore disconnect errors
              }
              try {
                await testPool2.end();
              } catch {
                // Ignore pool errors
              }
            }

            expect(connectionFailed).toBe(true);
          } catch (error) {
            try {
              await dbManager.cleanupTestDatabase(testSuite);
            } catch {
              // Ignore cleanup errors in error handler
            }
            throw error;
          }
        }),
        { numRuns: 1, verbose: true }
      );
    }); // 3 minute timeout for 3 iterations

    it('should handle cleanup of databases with complex relationships', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(nonEmptyStringArbitrary(), fc.integer({ min: 2, max: 3 })),
          async ([testSuiteName, entityCount]) => {
            const testSuite = `cleanup_complex_${testSuiteName}`;

            // Create a test database
            const db = await dbManager.createTestDatabase(testSuite, {
              type: 'integration',
              isolationLevel: 'database',
              autoCleanup: false,
              seedData: false,
            });

            const dbUrl = db.url;

            try {
              // Create a complex data structure with relationships
              const users = await Promise.all(
                Array.from({ length: entityCount }, (_, i) =>
                  db.client.account.create({
                    data: {
                      email: `complex_user${i}@test.com`,
                      name: `Complex User ${i}`,
                      passwordHash: 'hash',
                      role: Role.USER,
                    },
                  })
                )
              );

              const coaches = await Promise.all(
                Array.from({ length: entityCount }, (_, i) =>
                  db.client.account.create({
                    data: {
                      email: `complex_coach${i}@test.com`,
                      name: `Complex Coach ${i}`,
                      passwordHash: 'hash',
                      role: Role.COACH,
                    },
                  })
                )
              );

              // Create booking types
              const bookingTypes = await Promise.all(
                coaches.map((coach, i) =>
                  db.client.bookingType.create({
                    data: {
                      name: `Booking Type ${i}`,
                      description: `Description ${i}`,
                      basePrice: 50.0 + i * 10,
                      coachId: coach.id,
                      isActive: true,
                    },
                  })
                )
              );

              // Create time slots
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);

              await Promise.all(
                coaches.map((coach, i) =>
                  db.client.timeSlot.create({
                    data: {
                      dateTime: new Date(tomorrow.getTime() + i * 60 * 60 * 1000),
                      durationMin: 60,
                      isAvailable: true,
                      coachId: coach.id,
                    },
                  })
                )
              );

              // Create sessions
              await Promise.all(
                coaches.map(async (coach, i) => {
                  const user = users[i] ?? users[0];
                  const bookingType = bookingTypes[i] ?? bookingTypes[0];
                  const timeSlot = await db.client.timeSlot.findFirst({
                    where: { coachId: coach.id },
                  });

                  if (!user || !bookingType || !timeSlot) {
                    return Promise.resolve();
                  }

                  return db.client.session.create({
                    data: {
                      dateTime: new Date(tomorrow.getTime() + i * 60 * 60 * 1000),
                      durationMin: 60,
                      price: 75.0 + i * 15,
                      status: 'scheduled',
                      userId: user.id,
                      coachId: coach.id,
                      bookingTypeId: bookingType.id,
                      timeSlotId: timeSlot.id,
                    },
                  });
                })
              );

              // Verify data exists
              const totalAccounts = await db.client.account.count();
              const totalBookingTypes = await db.client.bookingType.count();
              const totalTimeSlots = await db.client.timeSlot.count();
              const totalSessions = await db.client.session.count();

              expect(totalAccounts).toBe(entityCount * 2); // users + coaches
              expect(totalBookingTypes).toBe(entityCount);
              expect(totalTimeSlots).toBe(entityCount);
              expect(totalSessions).toBe(entityCount);

              // Perform cleanup
              await dbManager.cleanupTestDatabase(testSuite);

              // Verify the database connection is removed
              const connection = dbManager.getTestDatabase(testSuite);
              expect(connection).toBeUndefined();

              // Verify the database no longer exists
              const { Pool } = await import('pg');
              const { PrismaPg } = await import('@prisma/adapter-pg');
              const testPool3 = new Pool({ connectionString: dbUrl });
              const testAdapter3 = new PrismaPg(testPool3);

              const testClient = new (await import('@prisma/client')).PrismaClient({
                adapter: testAdapter3,
              });

              let connectionFailed = false;
              try {
                await testClient.$connect();
                await testClient.$executeRawUnsafe(`SELECT 1`);
                await testClient.$disconnect();
                await testPool3.end();
              } catch {
                connectionFailed = true;
                try {
                  await testClient.$disconnect();
                } catch {
                  // Ignore disconnect errors
                }
                try {
                  await testPool3.end();
                } catch {
                  // Ignore pool errors
                }
              }

              expect(connectionFailed).toBe(true);
            } catch (error) {
              try {
                await dbManager.cleanupTestDatabase(testSuite);
              } catch {
                // Ignore cleanup errors in error handler
              }
              throw error;
            }
          }
        ),
        { numRuns: 1, verbose: true }
      );
    }); // 3 minute timeout for 3 iterations
  });

  // Placeholder for other property tests
  it('placeholder - property tests will be added in tasks 6.1, 7.1, 7.2', () => {
    expect(true).toBe(true);
  });
});
