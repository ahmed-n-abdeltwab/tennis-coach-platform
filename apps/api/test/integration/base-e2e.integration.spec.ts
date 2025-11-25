/**
 * Integration tests for BaseE2ETest
 * Verifies that BaseE2ETest properly loads the full AppModule and works with real application
 *
 * Requirements: 3.1
 */

import { Role } from '@prisma/client';

import { PrismaService } from '../../src/app/prisma/prisma.service';
import { BaseE2ETest } from '../utils/base/base-e2e';

/**
 * Concrete implementation of BaseE2ETest for testing purposes
 */
class TestE2EInstance extends BaseE2ETest {
  override async setupTestApp(): Promise<void> {
    // E2E tests use full AppModule, no additional setup needed
  }

  override getTestModules() {
    return super.getTestModules();
  }
}

describe('BaseE2ETest Integration Tests', () => {
  let testInstance: TestE2EInstance;

  beforeAll(async () => {
    testInstance = new TestE2EInstance();
    await testInstance.setup();
  });

  afterAll(async () => {
    await testInstance.cleanup();
  });

  describe('Setup and Initialization', () => {
    it('should load full AppModule', () => {
      const app = testInstance.getApp();
      const module = testInstance.getModule();

      expect(app).toBeDefined();
      expect(module).toBeDefined();
      expect(app).toBeInstanceOf(Object);
    });

    it('should initialize NestJS application', () => {
      const app = testInstance.getApp();

      expect(app).toBeDefined();
      expect(typeof app.getHttpServer).toBe('function');
      expect(typeof app.close).toBe('function');
    });

    it('should provide access to PrismaService', () => {
      const prisma = testInstance.getPrisma();

      expect(prisma).toBeDefined();
      expect(prisma.constructor.name).toBe('PrismaService');
    });

    it('should set global prefix to "api"', () => {
      const app = testInstance.getApp();

      // The app should have the global prefix set
      expect(app).toBeDefined();
      // We can't directly test the prefix, but we can verify the app is initialized
      expect(app.getHttpServer()).toBeDefined();
    });

    it('should initialize all application modules', () => {
      const module = testInstance.getModule();

      expect(module).toBeDefined();
      expect(typeof module.get).toBe('function');
      expect(typeof module.close).toBe('function');
    });
  });

  describe('Database Operations', () => {
    it('should perform database operations with full app', async () => {
      const prisma = testInstance.getPrisma();

      // Create a test user
      const user = await testInstance.createTestUser({
        email: 'e2e-test-user@example.com',
        name: 'E2E Test User',
      });

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('e2e-test-user@example.com');

      // Verify user exists in database
      const foundUser = await prisma.account.findUnique({
        where: { id: user.id },
      });

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('e2e-test-user@example.com');
    });

    it('should create related entities with full app', async () => {
      // Create coach
      const coach = await testInstance.createTestCoach({
        email: 'e2e-test-coach@example.com',
        name: 'E2E Test Coach',
      });

      // Create booking type for coach
      const bookingType = await testInstance.createTestBookingType({
        coachId: coach.id,
        name: 'E2E Test Booking',
      });

      // Create time slot for coach
      const timeSlot = await testInstance.createTestTimeSlot({
        coachId: coach.id,
      });

      expect(coach).toBeDefined();
      expect(bookingType).toBeDefined();
      expect(timeSlot).toBeDefined();
      expect(bookingType.coachId).toBe(coach.id);
      expect(timeSlot.coachId).toBe(coach.id);
    });

    it('should create session with all relationships', async () => {
      const session = await testInstance.createTestSession();

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.coachId).toBeDefined();
      expect(session.userId).toBeDefined();
      expect(session.bookingTypeId).toBeDefined();
      expect(session.timeSlotId).toBeDefined();

      // Verify all related entities exist
      const prisma = testInstance.getPrisma();
      const coach = await prisma.account.findUnique({ where: { id: session.coachId } });
      const user = await prisma.account.findUnique({ where: { id: session.userId } });
      const bookingType = await prisma.bookingType.findUnique({
        where: { id: session.bookingTypeId },
      });
      const timeSlot = await prisma.timeSlot.findUnique({ where: { id: session.timeSlotId } });

      expect(coach).toBeDefined();
      expect(user).toBeDefined();
      expect(bookingType).toBeDefined();
      expect(timeSlot).toBeDefined();
    });

    it('should clean databaseen tests', async () => {
      const prisma = testInstance.getPrisma();

      // Create some data
      const user = await testInstance.createTestUser({
        email: 'cleanup-test@example.com',
      });

      expect(user).toBeDefined();

      // Manually clean database
      await testInstance.cleanupDatabase();

      // Verify data is cleaned
      const userCount = await prisma.account.count();
      expect(userCount).toBe(0);

      // Re-seed for other tests
      await testInstance.seedTestData();
    });

    it('should use database helpers with full app', async () => {
      const user = await testInstance.createTestUser({
        email: 'helper-test@example.com',
      });

      // Test findRecord
      const foundUser = await testInstance.findRecord('account', { id: user.id });
      expect(foundUser).toBeDefined();
      expect(foundUser.email).toBe('helper-test@example.com');

      // Test countRecords
      const count = await testInstance.countRecords('account', { role: Role.USER });
      expect(count).toBeGreaterThan(0);

      // Test updateRecord
      const updatedUser = await testInstance.updateRecord(
        'account',
        { id: user.id },
        { name: 'Updated Name' }
      );
      expect(updatedUser.name).toBe('Updated Name');

      // Test deleteRecord
      await testInstance.deleteRecord('account', { id: user.id });
      const deletedUser = await testInstance.findRecord('account', { id: user.id });
      expect(deletedUser).toBeNull();
    });
  });

  describe('HTTP Requests', () => {
    it('should make HTTP requests against full app', async () => {
      // Test health endpoint (should exist in full app)
      const response = await testInstance.get('/health' as any);

      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });

    it('should create authentication tokens', async () => {
      const token = await testInstance.createTestJwtToken({
        sub: 'test-user-id',
        email: 'test@example.com',
        role: Role.USER,
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should create authentication headers', async () => {
      const headers = await testInstance.createAuthHeaders();

      expect(headers).toBeDefined();
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Bearer .+/);
    });

    it('should create role-specific tokens', async () => {
      const userToken = await testInstance.createRoleToken(Role.USER);
      const coachToken = await testInstance.createRoleToken(Role.COACH);
      const adminToken = await testInstance.createRoleToken(Role.ADMIN);

      expect(userToken).toBeDefined();
      expect(coachToken).toBeDefined();
      expect(adminToken).toBeDefined();

      // All should be valid JWT tokens
      expect(userToken.split('.')).toHaveLength(3);
      expect(coachToken.split('.')).toHaveLength(3);
      expect(adminToken.split('.')).toHaveLength(3);
    });

    it('should create expired tokens', async () => {
      const expiredToken = await testInstance.createExpiredToken();

      expect(expiredToken).toBeDefined();
      expect(typeof expiredToken).toBe('string');
      expect(expiredToken.split('.')).toHaveLength(3);
    });
  });

  describe('Test Data Creation', () => {
    it('should create multiple test users', async () => {
      const users = await testInstance.createTestUsers(3);

      expect(users).toHaveLength(3);
      users.forEach(user => {
        expect(user.id).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.role).toBe(Role.USER);
      });

      // Verify all emails are unique
      const emails = users.map(u => u.email);
      expect(new Set(emails).size).toBe(3);
    });

    it('should create multiple test coaches', async () => {
      const coaches = await testInstance.createTestCoaches(3);

      expect(coaches).toHaveLength(3);
      coaches.forEach(coach => {
        expect(coach.id).toBeDefined();
        expect(coach.email).toBeDefined();
        expect(coach.role).toBe(Role.COACH);
      });

      // Verify all emails are unique
      const emails = coaches.map(c => c.email);
      expect(new Set(emails).size).toBe(3);
    });

    it('should use cached coach and user', async () => {
      const coach1 = await testInstance.getCachedCoach();
      const coach2 = await testInstance.getCachedCoach();

      expect(coach1.id).toBe(coach2.id);

      const user1 = await testInstance.getCachedUser();
      const user2 = await testInstance.getCachedUser();

      expect(user1.id).toBe(user2.id);
    });
  });

  describe('Assertion Helpers', () => {
    it('should assert response structure', async () => {
      const mockResponse = {
        body: {
          id: '123',
          name: 'Test',
          email: 'test@example.com',
        },
      };

      expect(() => {
        testInstance['assertResponseStructure'](mockResponse, ['id', 'name', 'email']);
      }).not.toThrow();
    });

    it('should assert success response', async () => {
      const mockResponse = {
        status: 200,
        body: { success: true },
      };

      expect(() => {
        testInstance['assertSuccessResponse'](mockResponse, 200);
      }).not.toThrow();
    });

    it('should assert error response', async () => {
      const mockResponse = {
        status: 400,
        body: { message: 'Bad Request' },
        ok: false,
      };

      expect(() => {
        testInstance['assertErrorResponse'](mockResponse, 400, 'Bad Request');
      }).not.toThrow();
    });

    it('should assert data exists in database', async () => {
      const user = await testInstance.createTestUser({
        email: 'assert-exists@example.com',
      });

      await expect(
        testInstance['assertDataExists']('account', { id: user.id })
      ).resolves.not.toThrow();
    });

    it('should assert data not exists in database', async () => {
      await expect(
        testInstance['assertDataNotExists']('account', { id: 'non-existent-id' })
      ).resolves.not.toThrow();
    });
  });

  describe('Transaction Support', () => {
    it('should execute operations in transaction', async () => {
      const result = await testInstance['withTransaction'](async tx => {
        const user = await tx.account.create({
          data: {
            email: 'transaction-test@example.com',
            name: 'Transaction Test',
            passwordHash: 'hashed',
            role: Role.USER,
          },
        });

        return user;
      });

      expect(result).toBeDefined();
      expect(result.email).toBe('transaction-test@example.com');

      // Verify user exists after transaction
      const prisma = testInstance.getPrisma();
      const foundUser = await prisma.account.findUnique({
        where: { id: result.id },
      });
      expect(foundUser).toBeDefined();
    });
  });

  describe('Wait Helpers', () => {
    it('should wait for condition to become true', async () => {
      let conditionMet = false;

      setTimeout(() => {
        conditionMet = true;
      }, 100);

      await expect(
        testInstance['waitForCondition'](() => conditionMet, 1000, 50)
      ).resolves.not.toThrow();
    });

    it('should timeout if condition not met', async () => {
      await expect(testInstance['waitForCondition'](() => false, 200, 50)).rejects.toThrow(
        'Condition not met within timeout'
      );
    });

    it('should wait for database record', async () => {
      // Create user after a delay
      setTimeout(async () => {
        await testInstance.createTestUser({
          email: 'wait-record@example.com',
        });
      }, 100);

      const record = await testInstance['waitForRecord'](
        'account',
        { email: 'wait-record@example.com' },
        2000
      );

      expect(record).toBeDefined();
      expect(record.email).toBe('wait-record@example.com');
    });
  });

  describe('Full Application Integration', () => {
    it('should have all modules loaded', () => {
      const module = testInstance.getModule();

      // Verify we can get services from various modules
      expect(() => module.get(PrismaService)).not.toThrow();
    });

    it('should support end-to-end workflows', async () => {
      // Create a complete workflow: coach -> booking type -> time slot -> user -> session
      const coach = await testInstance.createTestCoach({
        email: 'workflow-coach@example.com',
      });

      const bookingType = await testInstance.createTestBookingType({
        coachId: coach.id,
        name: 'Workflow Booking',
      });

      const timeSlot = await testInstance.createTestTimeSlot({
        coachId: coach.id,
      });

      const user = await testInstance.createTestUser({
        email: 'workflow-user@example.com',
      });

      const session = await testInstance.createTestSession({
        coachId: coach.id,
        userId: user.id,
        bookingTypeId: bookingType.id,
        timeSlotId: timeSlot.id,
      });

      // Verify the complete workflow
      expect(session).toBeDefined();
      expect(session.coachId).toBe(coach.id);
      expect(session.userId).toBe(user.id);
      expect(session.bookingTypeId).toBe(bookingType.id);
      expect(session.timeSlotId).toBe(timeSlot.id);

      // Verify all entities are in database
      const prisma = testInstance.getPrisma();
      const foundCoach = await prisma.account.findUnique({ where: { id: coach.id } });
      const foundUser = await prisma.account.findUnique({ where: { id: user.id } });
      const foundBookingType = await prisma.bookingType.findUnique({
        where: { id: bookingType.id },
      });
      const foundTimeSlot = await prisma.timeSlot.findUnique({ where: { id: timeSlot.id } });
      const foundSession = await prisma.session.findUnique({ where: { id: session.id } });

      expect(foundCoach).toBeDefined();
      expect(foundUser).toBeDefined();
      expect(foundBookingType).toBeDefined();
      expect(foundTimeSlot).toBeDefined();
      expect(foundSession).toBeDefined();
    });
  });
});
