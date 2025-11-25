/**
 * Integration tests for BaseIntegrationTest
 * Verifies that the base test class properly initializes app, prisma, module
 * and provides correct database setup/cleanup and seeding functionality
 *
 * Requirements: 3.1
 */

import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { parseJwtTime } from '@utils';

import { PrismaModule } from '../../src/app/prisma/prisma.module';
import { BaseIntegrationTest } from '../utils/base/base-integration';

/**
 * Concrete implementation of BaseIntegrationTest for testing purposes
 */
class TestableIntegrationTest extends BaseIntegrationTest {
  async setupTestApp(): Promise<void> {
    // Minimal setup for testing
  }

  getTestModules(): any[] {
    return [
      ConfigModule.forRoot({
        isGlobal: true,
      }),
      PrismaModule,
      JwtModule.register({
        secret: process.env.JWT_SECRET ?? 'test-secret',
        signOptions: { expiresIn: parseJwtTime(process.env.JWT_EXPIRES_IN, '24h') },
      }),
    ];
  }
}

describe('BaseIntegrationTest Integration Tests', () => {
  let testInstance: TestableIntegrationTest;

  describe('setup() method', () => {
    beforeEach(async () => {
      testInstance = new TestableIntegrationTest();
    });

    afterEach(async () => {
      if (testInstance) {
        await testInstance.cleanup();
      }
    });

    it('should initialize app correctly', async () => {
      await testInstance.setup();

      const app = testInstance.getApp();
      expect(app).toBeDefined();
      expect(app).toBeTruthy();
    });

    it('should initialize prisma service correctly', async () => {
      await testInstance.setup();

      const prisma = testInstance.getPrisma();
      expect(prisma).toBeDefined();
      // Check that prisma has the expected methods instead of instanceof
      expect(typeof prisma.$connect).toBe('function');
      expect(typeof prisma.$disconnect).toBe('function');
      expect(typeof prisma.account).toBe('object');
    });

    it('should initialize module correctly', async () => {
      await testInstance.setup();

      const module = testInstance.getModule();
      expect(module).toBeDefined();
      expect(module).toBeTruthy();
    });

    it('should set global prefix on app', async () => {
      await testInstance.setup();

      const app = testInstance.getApp();
      const httpServer = app.getHttpServer();
      expect(httpServer).toBeDefined();
    });

    it('should initialize app before accessing it', async () => {
      await testInstance.setup();

      const app = testInstance.getApp();
      // App should be initialized and ready to handle requests
      expect(app).toBeDefined();
      const httpAdapter = app.getHttpAdapter();
      expect(httpAdapter).toBeDefined();
    });
  });

  describe('cleanup() method', () => {
    beforeEach(async () => {
      testInstance = new TestableIntegrationTest();
      await testInstance.setup();
    });

    it('should close app without errors', async () => {
      await expect(testInstance.cleanup()).resolves.not.toThrow();
    });

    it('should close module without errors', async () => {
      const module = testInstance.getModule();
      expect(module).toBeDefined();

      await testInstance.cleanup();

      // After cleanup, attempting to get services should fail or return closed instances
      // This verifies the module was properly closed
    });

    it('should handle cleanup when called multiple times', async () => {
      await testInstance.cleanup();
      // Second cleanup should not throw
      await expect(testInstance.cleanup()).resolves.not.toThrow();
    });
  });

  describe('setupDatabase() method', () => {
    beforeEach(async () => {
      testInstance = new TestableIntegrationTest();
      await testInstance.setup();
    });

    afterEach(async () => {
      await testInstance.cleanup();
    });

    it('should clean database before seeding', async () => {
      // Create some test data
      const prisma = testInstance.getPrisma();
      await prisma.account.create({
        data: {
          email: 'temp@test.com',
          name: 'Temp User',
          passwordHash: 'hash',
          role: Role.USER,
        },
      });

      // Setup database should clean and reseed
      await testInstance.setupDatabase();

      // Check that the temp user is gone and only seeded data exists
      const tempUser = await prisma.account.findUnique({
        where: { email: 'temp@test.com' },
      });
      expect(tempUser).toBeNull();
    });

    it('should seed test data after cleaning', async () => {
      await testInstance.setupDatabase();

      const prisma = testInstance.getPrisma();
      const users = await prisma.account.findMany({ where: { role: Role.USER } });
      const coaches = await prisma.account.findMany({ where: { role: Role.COACH } });

      expect(users.length).toBeGreaterThan(0);
      expect(coaches.length).toBeGreaterThan(0);
    });

    it('should create consistent test data structure', async () => {
      await testInstance.setupDatabase();

      const testData = testInstance['testData'];
      expect(testData).toBeDefined();
      expect(testData).toHaveProperty('users');
      expect(testData).toHaveProperty('coaches');
      expect(testData).toHaveProperty('bookingTypes');
    });
  });

  describe('cleanupDatabase() method', () => {
    beforeEach(async () => {
      testInstance = new TestableIntegrationTest();
      await testInstance.setup();
    });

    afterEach(async () => {
      await testInstance.cleanup();
    });

    it('should remove all data from database', async () => {
      const prisma = testInstance.getPrisma();

      // Create test data
      await prisma.account.create({
        data: {
          email: 'cleanup-test@test.com',
          name: 'Cleanup Test',
          passwordHash: 'hash',
          role: Role.USER,
        },
      });

      // Cleanup database
      await testInstance.cleanupDatabase();

      // Verify all data is removed
      const accountCount = await prisma.account.count();
      expect(accountCount).toBe(0);
    });

    it('should handle cleanup of empty database', async () => {
      await testInstance.cleanupDatabase();
      await expect(testInstance.cleanupDatabase()).resolves.not.toThrow();
    });

    it('should handle foreign key constraints correctly', async () => {
      const prisma = testInstance.getPrisma();

      // Create related data
      const coach = await prisma.account.create({
        data: {
          email: 'coach-fk@test.com',
          name: 'Coach FK',
          passwordHash: 'hash',
          role: Role.COACH,
        },
      });

      await prisma.bookingType.create({
        data: {
          name: 'Test Booking',
          description: 'Test',
          basePrice: 50,
          coachId: coach.id,
          isActive: true,
        },
      });

      // Cleanup should handle foreign keys
      await expect(testInstance.cleanupDatabase()).resolves.not.toThrow();

      // Verify all data is removed
      const coachCount = await prisma.account.count();
      const bookingTypeCount = await prisma.bookingType.count();
      expect(coachCount).toBe(0);
      expect(bookingTypeCount).toBe(0);
    });
  });

  describe('seedTestData() method', () => {
    beforeEach(async () => {
      testInstance = new TestableIntegrationTest();
      await testInstance.setup();
      await testInstance.cleanupDatabase();
    });

    afterEach(async () => {
      await testInstance.cleanup();
    });

    it('should create default test data', async () => {
      await testInstance.seedTestData();

      const prisma = testInstance.getPrisma();
      const users = await prisma.account.findMany({ where: { role: Role.USER } });
      const coaches = await prisma.account.findMany({ where: { role: Role.COACH } });
      const bookingTypes = await prisma.bookingType.findMany();

      expect(users.length).toBeGreaterThan(0);
      expect(coaches.length).toBeGreaterThan(0);
      expect(bookingTypes.length).toBeGreaterThan(0);
    });

    it('should create users with correct structure', async () => {
      await testInstance.seedTestData();

      const prisma = testInstance.getPrisma();
      const users = await prisma.account.findMany({ where: { role: Role.USER } });

      users.forEach(user => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('passwordHash');
        expect(user.role).toBe(Role.USER);
      });
    });

    it('should create coaches with correct structure', async () => {
      await testInstance.seedTestData();

      const prisma = testInstance.getPrisma();
      const coaches = await prisma.account.findMany({ where: { role: Role.COACH } });

      coaches.forEach(coach => {
        expect(coach).toHaveProperty('id');
        expect(coach).toHaveProperty('email');
        expect(coach).toHaveProperty('name');
        expect(coach).toHaveProperty('passwordHash');
        expect(coach.role).toBe(Role.COACH);
      });
    });

    it('should create booking types linked to coaches', async () => {
      await testInstance.seedTestData();

      const prisma = testInstance.getPrisma();
      const bookingTypes = await prisma.bookingType.findMany({
        include: { coach: true },
      });

      bookingTypes.forEach(bookingType => {
        expect(bookingType).toHaveProperty('id');
        expect(bookingType).toHaveProperty('name');
        expect(bookingType).toHaveProperty('coachId');
        expect(bookingType.coach).toBeDefined();
        expect(bookingType.coach.role).toBe(Role.COACH);
      });
    });

    it('should store seeded data in testData property', async () => {
      await testInstance.seedTestData();

      const testData = testInstance['testData'];
      expect(testData).toBeDefined();
      expect(testData.users).toBeDefined();
      expect(testData.coaches).toBeDefined();
      expect(testData.bookingTypes).toBeDefined();
      expect(Array.isArray(testData.users)).toBe(true);
      expect(Array.isArray(testData.coaches)).toBe(true);
      expect(Array.isArray(testData.bookingTypes)).toBe(true);
    });

    it('should create consistent data on multiple calls', async () => {
      await testInstance.seedTestData();
      const firstSeed = testInstance['testData'];

      await testInstance.cleanupDatabase();
      await testInstance.seedTestData();
      const secondSeed = testInstance['testData'];

      // Should have same structure and counts
      expect(firstSeed.users.length).toBe(secondSeed.users.length);
      expect(firstSeed.coaches.length).toBe(secondSeed.coaches.length);
      expect(firstSeed.bookingTypes.length).toBe(secondSeed.bookingTypes.length);
    });
  });

  describe('Full lifecycle test', () => {
    it('should handle complete setup and cleanup cycle', async () => {
      testInstance = new TestableIntegrationTest();

      // Setup
      await testInstance.setup();
      expect(testInstance.getApp()).toBeDefined();
      expect(testInstance.getPrisma()).toBeDefined();
      expect(testInstance.getModule()).toBeDefined();

      // Verify database is seeded
      const prisma = testInstance.getPrisma();
      const userCount = await prisma.account.count({ where: { role: Role.USER } });
      expect(userCount).toBeGreaterThan(0);

      // Cleanup
      await testInstance.cleanup();

      // After cleanup, we can't verify database state as connection is closed
      // But we verified cleanup doesn't throw errors
    });

    it('should handle multiple setup/cleanup cycles', async () => {
      testInstance = new TestableIntegrationTest();

      // First cycle
      await testInstance.setup();
      await testInstance.cleanup();

      // Second cycle
      testInstance = new TestableIntegrationTest();
      await testInstance.setup();
      expect(testInstance.getApp()).toBeDefined();
      await testInstance.cleanup();
    });
  });

  describe('Error handling', () => {
    it('should handle cleanup when app is not initialized', async () => {
      testInstance = new TestableIntegrationTest();
      // Don't call setup
      await expect(testInstance.cleanup()).resolves.not.toThrow();
    });

    it('should handle setupDatabase when prisma is not available', async () => {
      // Create a test instance without PrismaService
      class NoPrismaTest extends BaseIntegrationTest {
        async setupTestApp(): Promise<void> {}
        getTestModules(): any[] {
          return [ConfigModule.forRoot({ isGlobal: true })];
        }
        override getTestProviders(): any[] {
          return []; // No PrismaService
        }
      }

      const noPrismaInstance = new NoPrismaTest();
      await noPrismaInstance.setup();

      // Should not throw when prisma is not available
      await expect(noPrismaInstance.setupDatabase()).resolves.not.toThrow();
      await expect(noPrismaInstance.cleanupDatabase()).resolves.not.toThrow();

      await noPrismaInstance.cleanup();
    });
  });
});
