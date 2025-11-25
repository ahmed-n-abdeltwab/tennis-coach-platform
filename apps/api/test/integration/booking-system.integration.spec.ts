/**
 * Integration tests for booking system workflows
 * Tests complete booking workflows and cross-module interactions
 * Demonstrates using BaseIntegrationTest with custom test data setup
 */

import { Account, BookingType, Prisma, Session, TimeSlot } from '@prisma/client';

import { AccountsModule } from '../../src/app/accounts/accounts.module';
import { BookingTypesModule } from '../../src/app/booking-types/booking-types.module';
import { IamModule } from '../../src/app/iam/iam.module';
import { SessionsModule } from '../../src/app/sessions/sessions.module';
import { TimeSlotsModule } from '../../src/app/time-slots/time-slots.module';
import { BaseIntegrationTest } from '../utils/base/base-integration';

/**
 * Booking System Integration Test Class
 * Extends BaseIntegrationTest to leverage type-safe HTTP methods and database helpers
 */
class BookingSystemIntegrationTest extends BaseIntegrationTest {
  // Test data
  testUser!: Account;
  testCoach!: Account;
  testBookingType!: BookingType;
  testTimeSlot!: TimeSlot;
  testSession!: Session;
  userToken!: string;
  coachToken!: string;

  async setupTestApp(): Promise<void> {
    // No additional setup needed
  }

  getTestModules(): any[] {
    return [SessionsModule, TimeSlotsModule, BookingTypesModule, IamModule, AccountsModule];
  }

  /**
   * Custom seed method for booking system tests
   * Creates user, coach, booking type, and time slot
   */
  override async seedTestData(): Promise<void> {
    // Create test user and coach using base class helpers with unique emails
    const timestamp = Date.now();
    this.testUser = await this.createTestUser({
      email: `testuser-${timestamp}@example.com`,
    });

    this.testCoach = await this.createTestCoach({
      email: `testcoach-${timestamp}@example.com`,
    });

    // Verify coach was created successfully
    if (!this.testCoach?.id) {
      throw new Error('Failed to create test coach');
    }

    // Verify coach exists in database
    const verifyCoach = await this.prisma.account.findUnique({
      where: { id: this.testCoach.id },
    });

    if (!verifyCoach) {
      throw new Error(`Coach with id ${this.testCoach.id} not found in database after creation`);
    }

    // Create booking type and time slot
    this.testBookingType = await this.createTestBookingType({
      coachId: this.testCoach.id,
      name: 'Individual Lesson',
      basePrice: new Prisma.Decimal(100),
      isActive: true,
    });

    this.testTimeSlot = await this.createTestTimeSlot({
      coachId: this.testCoach.id,
      dateTime: new Date('2025-12-25T10:00:00Z'),
      durationMin: 60,
      isAvailable: true,
    });

    // Recreate auth tokens with fresh user/coach IDs
    await this.refreshTokens();
  }

  /**
   * Refresh auth tokens with current user/coach IDs
   */
  private async refreshTokens(): Promise<void> {
    this.userToken = await this.createTestJwtToken({
      sub: this.testUser.id,
      email: this.testUser.email,
      role: this.testUser.role,
    });

    this.coachToken = await this.createTestJwtToken({
      sub: this.testCoach.id,
      email: this.testCoach.email,
      role: this.testCoach.role,
    });
  }

  /**
   * Helper to create a test session for tests that need one
   */
  async createSessionForTest(): Promise<Session> {
    // Ensure we have fresh test data
    if (!this.testUser || !this.testCoach || !this.testBookingType || !this.testTimeSlot) {
      await this.seedTestData();
    }

    this.testSession = await this.createTestSession({
      userId: this.testUser.id,
      coachId: this.testCoach.id,
      bookingTypeId: this.testBookingType.id,
      timeSlotId: this.testTimeSlot.id,
      status: 'SCHEDULED',
      dateTime: new Date('2025-12-25T10:00:00Z'),
    });
    return this.testSession;
  }
}

describe('Booking System Integration', () => {
  let testInstance: BookingSystemIntegrationTest;

  beforeAll(async () => {
    testInstance = new BookingSystemIntegrationTest();
    await testInstance.setup();
  });

  afterAll(async () => {
    await testInstance.cleanup();
  });

  beforeEach(async () => {
    // Clean and reseed test data before each test to ensure clean state
    await testInstance.cleanupDatabase();
    await testInstance.seedTestData();
  });

  describe('Complete Booking Workflow', () => {
    it('should complete full booking workflow from time slot creation to session booking', async () => {
      // Step 1: Coach creates a time slot (already created in setup)
      const timeSlotsResponse = await testInstance.authenticatedGet(
        '/api/time-slots',
        testInstance.coachToken
      );

      expect(timeSlotsResponse.ok).toBe(true);
      if (timeSlotsResponse.ok) {
        expect(timeSlotsResponse.body).toBeDefined();
        expect(Array.isArray(timeSlotsResponse.body)).toBe(true);
      }

      // Step 2: User views available booking types
      const bookingTypesResponse = await testInstance.authenticatedGet(
        '/api/booking-types',
        testInstance.userToken
      );

      expect(bookingTypesResponse.ok).toBe(true);
      if (bookingTypesResponse.ok) {
        expect(bookingTypesResponse.body).toBeDefined();
        expect(Array.isArray(bookingTypesResponse.body)).toBe(true);
      }

      // Step 3: User creates a session booking
      const createSessionResponse = await testInstance.authenticatedPost(
        '/api/sessions',
        testInstance.userToken,
        {
          body: {
            bookingTypeId: testInstance.testBookingType.id,
            timeSlotId: testInstance.testTimeSlot.id,
          },
        }
      );

      expect(createSessionResponse.ok).toBe(true);
      if (createSessionResponse.ok) {
        expect(createSessionResponse.status).toBe(201);
        expect(createSessionResponse.body).toHaveProperty('id');
        expect(createSessionResponse.body.userId).toBe(testInstance.testUser.id);
        expect(createSessionResponse.body.coachId).toBe(testInstance.testCoach.id);
      }
    });

    it.todo('should handle booking with discount code');
  });

  describe('Session Management Workflow', () => {
    it('should allow user to view their sessions', async () => {
      // Create a test session for this test
      await testInstance.createSessionForTest();
      const response = await testInstance.authenticatedGet('/api/sessions', testInstance.userToken);

      expect(response.ok).toBe(true);
      if (response.ok) {
        const sessions = response.body.data ?? response.body;
        expect(Array.isArray(sessions)).toBe(true);
        expect(sessions).toBeDefined();
        if (Array.isArray(sessions)) {
          expect(sessions.length).toBeGreaterThan(0);
          expect(sessions[0]).toHaveProperty('id');
          expect(sessions[0]?.userId).toBe(testInstance.testUser.id);
        }
      }
    });

    it('should allow coach to view their sessions', async () => {
      // Create a test session for this test
      await testInstance.createSessionForTest();

      const response = await testInstance.authenticatedGet(
        '/api/sessions',
        testInstance.coachToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        const sessions = response.body.data ?? response.body;
        expect(Array.isArray(sessions)).toBe(true);
        if (Array.isArray(sessions)) {
          expect(sessions.length).toBeGreaterThan(0);
          expect(sessions[0]?.coachId).toBe(testInstance.testCoach.id);
        }
      }
    });

    it.todo('should allow session updates');

    it.todo('should allow session cancellation');

    it.todo('should filter sessions by status');

    it.todo('should filter sessions by date range');
  });

  describe('Time Slot Management Workflow', () => {
    it.todo('should allow coach to manage their time slots');

    it.todo('should filter available time slots by coach');

    it.todo('should filter time slots by date range');
  });

  describe('Booking Type Management Workflow', () => {
    it.todo('should allow coach to manage their booking types');
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle booking unavailable time slot', async () => {
      // Create an unavailable time slot
      const timeSlot = await testInstance.createTestTimeSlot({
        coachId: testInstance.testCoach.id,
        dateTime: new Date('2025-01-15T14:00:00Z'),
        durationMin: 60,
        isAvailable: false,
      });

      const response = await testInstance.authenticatedPost(
        '/api/sessions',
        testInstance.userToken,
        {
          body: {
            bookingTypeId: testInstance.testBookingType.id,
            timeSlotId: timeSlot.id,
          },
        }
      );

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should prevent unauthorized access to other users sessions', async () => {
      // Create a session for the test user
      const session = await testInstance.createTestSession({
        userId: testInstance.testUser.id,
        coachId: testInstance.testCoach.id,
        bookingTypeId: testInstance.testBookingType.id,
        timeSlotId: testInstance.testTimeSlot.id,
      });

      // Create another user
      const otherUser = await testInstance.createTestUser({
        email: 'otheruser@example.com',
      });
      const otherUserToken = await testInstance.createTestJwtToken({
        sub: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      // Try to access the test session with different user token
      const response = await testInstance.authenticatedGet(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        otherUserToken
      );

      // Should either return 403 Forbidden or 404 Not Found
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect([403, 404]).toContain(response.status);
      }
    });

    it.todo('should handle booking inactive booking type');

    it.todo('should handle invalid discount code');

    it.todo('should prevent cancelling past sessions');
  });
});
