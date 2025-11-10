/**
 * Integration tests for booking system workflows
 * Tests complete booking workflows and cross-module interactions
 * Demonstrates using BaseIntegrationTest with custom test data setup
 */

import { todo } from 'node:test';

import { Account, BookingType, Session, TimeSlot } from '@prisma/client';

import { AccountsModule } from '../../src/app/accounts/accounts.module';
import { BookingTypesModule } from '../../src/app/booking-types/booking-types.module';
import { IamModule } from '../../src/app/iam/iam.module';
import { SessionsModule } from '../../src/app/sessions/sessions.module';
import { TimeSlotsModule } from '../../src/app/time-slots/time-slots.module';
import { BaseIntegrationTest } from '../utils/base/base-integration.test';

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
  async seedTestData(): Promise<void> {
    // Create test user and coach using base class helpers
    this.testUser = await this.createTestUser({
      email: 'testuser@example.com',
    });

    this.testCoach = await this.createTestCoach({
      email: 'testcoach@example.com',
    });

    // Create booking type and time slot
    this.testBookingType = await this.createTestBookingType({
      coachId: this.testCoach.id,
      name: 'Individual Lesson',
      basePrice: 100,
      isActive: true,
    });

    this.testTimeSlot = await this.createTestTimeSlot({
      coachId: this.testCoach.id,
      dateTime: new Date('2024-12-25T10:00:00Z'),
      durationMin: 60,
      isAvailable: true,
    });

    // Create auth tokens using base class helper
    this.userToken = this.createTestJwtToken({
      sub: this.testUser.id,
      email: this.testUser.email,
      role: this.testUser.role,
    });

    this.coachToken = this.createTestJwtToken({
      sub: this.testCoach.id,
      email: this.testCoach.email,
      role: this.testCoach.role,
    });
  }

  /**
   * Helper to create a test session for tests that need one
   */
  async createSessionForTest(): Promise<Session> {
    this.testSession = await this.createTestSession({
      userId: this.testUser.id,
      coachId: this.testCoach.id,
      bookingTypeId: this.testBookingType.id,
      timeSlotId: this.testTimeSlot.id,
      status: 'SCHEDULED',
      dateTime: new Date('2024-12-25T10:00:00Z'),
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

  describe('Complete Booking Workflow', () => {
    it('should complete full booking workflow from time slot creation to session booking', async () => {
      // Step 1: Coach creates a time slot (already created in setup)
      const timeSlotsResponse = await testInstance.typeSafeAuthenticatedGet<Endpoints>(
        '/api/time-slots',
        testInstance.coachToken
      );

      expect(timeSlotsResponse.ok).toBe(true);
      if (timeSlotsResponse.ok) {
        expect(timeSlotsResponse.body).toBeDefined();
        expect(Array.isArray(timeSlotsResponse.body)).toBe(true);
      }

      // Step 2: User views available booking types
      const bookingTypesResponse = await testInstance.typeSafeAuthenticatedGet<Endpoints>(
        '/api/booking-types',
        testInstance.userToken
      );

      expect(bookingTypesResponse.ok).toBe(true);
      if (bookingTypesResponse.ok) {
        expect(bookingTypesResponse.body).toBeDefined();
        expect(Array.isArray(bookingTypesResponse.body)).toBe(true);
      }

      // Step 3: User creates a session booking
      const createSessionResponse = await testInstance.typeSafeAuthenticatedPost<Endpoints>(
        '/api/sessions',
        testInstance.userToken,
        {
          coachId: testInstance.testCoach.id,
          bookingTypeId: testInstance.testBookingType.id,
          timeSlotId: testInstance.testTimeSlot.id,
          dateTime: new Date('2024-12-25T10:00:00Z').toISOString(),
          durationMin: 60,
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

    todo('should handle booking with discount code');
  });

  describe('Session Management Workflow', () => {
    beforeEach(async () => {
      // Create a test session for each test
      await testInstance.createSessionForTest();
    });

    it('should allow user to view their sessions', async () => {
      const response = await testInstance.typeSafeAuthenticatedGet<Endpoints>(
        '/api/sessions',
        testInstance.userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0].userId).toBe(testInstance.testUser.id);
      }
    });

    it('should allow coach to view their sessions', async () => {
      const response = await testInstance.typeSafeAuthenticatedGet<Endpoints>(
        '/api/sessions',
        testInstance.coachToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].coachId).toBe(testInstance.testCoach.id);
      }
    });

    todo('should allow session updates');

    todo('should allow session cancellation');

    todo('should filter sessions by status');

    todo('should filter sessions by date range');
  });

  describe('Time Slot Management Workflow', () => {
    todo('should allow coach to manage their time slots');

    todo('should filter available time slots by coach');

    todo('should filter time slots by date range');
  });

  describe('Booking Type Management Workflow', () => {
    todo('should allow coach to manage their booking types');
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await testInstance.createSessionForTest();
    });

    it('should handle booking unavailable time slot', async () => {
      // Mark time slot as unavailable
      await testInstance.updateRecord(
        'timeSlot',
        { id: testInstance.testTimeSlot.id },
        { isAvailable: false }
      );

      const response = await testInstance.typeSafeAuthenticatedPost<Endpoints>(
        '/api/sessions',
        testInstance.userToken,
        {
          coachId: testInstance.testCoach.id,
          bookingTypeId: testInstance.testBookingType.id,
          timeSlotId: testInstance.testTimeSlot.id,
          dateTime: new Date('2024-12-25T10:00:00Z').toISOString(),
          durationMin: 60,
        }
      );

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should prevent unauthorized access to other users sessions', async () => {
      // Create another user
      const otherUser = await testInstance.createTestUser({
        email: 'otheruser@example.com',
      });
      const otherUserToken = testInstance.createTestJwtToken({
        sub: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      // Try to access the test session with different user token
      const response = await testInstance.typeSafeAuthenticatedGet<Endpoints>(
        `/api/sessions/${testInstance.testSession.id}` as any,
        otherUserToken
      );

      // Should either return 403 Forbidden or 404 Not Found
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect([403, 404]).toContain(response.status);
      }
    });

    todo('should handle booking inactive booking type');

    todo('should handle invalid discount code');

    todo('should prevent cancelling past sessions');
  });
});
