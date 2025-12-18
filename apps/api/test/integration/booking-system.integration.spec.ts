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
import { IntegrationTest } from '../utils';

describe('Booking System Integration', () => {
  let test: IntegrationTest;
  let testUser: Account;
  let testCoach: Account;
  let testBookingType: BookingType;
  let testTimeSlot: TimeSlot;
  let testSession: Session;
  let userToken: string;
  let coachToken: string;

  /**
   * Custom seed method for booking system tests
   * Creates user, coach, booking type, and time slot
   */
  async function seedBookingTestData(): Promise<void> {
    // Create test user and coach using base class helpers with unique emails
    const timestamp = Date.now();
    testUser = await test.db.createTestUser({
      email: `testuser-${timestamp}@example.com`,
    });

    testCoach = await test.db.createTestCoach({
      email: `testcoach-${timestamp}@example.com`,
    });

    // Verify coach was created successfully
    if (!testCoach?.id) {
      throw new Error('Failed to create test coach');
    }

    // Verify coach exists in database
    const verifyCoach = await test.database.account.findUnique({
      where: { id: testCoach.id },
    });

    if (!verifyCoach) {
      throw new Error(`Coach with id ${testCoach.id} not found in database after creation`);
    }

    // Create booking type and time slot
    testBookingType = await test.db.createTestBookingType({
      coachId: testCoach.id,
      name: 'Individual Lesson',
      basePrice: new Prisma.Decimal(100),
      isActive: true,
    });

    testTimeSlot = await test.db.createTestTimeSlot({
      coachId: testCoach.id,
      dateTime: new Date('2025-12-25T10:00:00Z'),
      durationMin: 60,
      isAvailable: true,
    });

    // Create auth tokens with fresh user/coach IDs
    userToken = await test.auth.createTestJwtToken({
      sub: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });

    coachToken = await test.auth.createTestJwtToken({
      sub: testCoach.id,
      email: testCoach.email,
      role: testCoach.role,
    });
  }

  /**
   * Helper to create a test session for tests that need one
   */
  async function createSessionForTest(): Promise<Session> {
    // Ensure we have fresh test data
    if (!testUser || !testCoach || !testBookingType || !testTimeSlot) {
      await seedBookingTestData();
    }

    testSession = await test.db.createTestSession({
      userId: testUser.id,
      coachId: testCoach.id,
      bookingTypeId: testBookingType.id,
      timeSlotId: testTimeSlot.id,
      status: 'SCHEDULED',
      dateTime: new Date('2025-12-25T10:00:00Z'),
    });
    return testSession;
  }

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [SessionsModule, TimeSlotsModule, BookingTypesModule, IamModule, AccountsModule],
    });

    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    // Clean and reseed test data before each test to ensure clean state
    await test.db.cleanupDatabase();
    await seedBookingTestData();
  });

  describe('Complete Booking Workflow', () => {
    it('should complete full booking workflow from time slot creation to session booking', async () => {
      // Step 1: Coach creates a time slot (already created in setup)
      const timeSlotsResponse = await test.http.authenticatedGet('/api/time-slots', coachToken);

      expect(timeSlotsResponse.ok).toBe(true);
      if (timeSlotsResponse.ok) {
        expect(timeSlotsResponse.body).toBeDefined();
        expect(Array.isArray(timeSlotsResponse.body)).toBe(true);
      }

      // Step 2: User views available booking types
      const bookingTypesResponse = await test.http.authenticatedGet(
        '/api/booking-types',
        userToken
      );

      expect(bookingTypesResponse.ok).toBe(true);
      if (bookingTypesResponse.ok) {
        expect(bookingTypesResponse.body).toBeDefined();
        expect(Array.isArray(bookingTypesResponse.body)).toBe(true);
      }

      // Step 3: User creates a session booking
      const createSessionResponse = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
        },
      });

      expect(createSessionResponse.ok).toBe(true);
      if (createSessionResponse.ok) {
        expect(createSessionResponse.status).toBe(201);
        expect(createSessionResponse.body).toHaveProperty('id');
        expect(createSessionResponse.body.userId).toBe(testUser.id);
        expect(createSessionResponse.body.coachId).toBe(testCoach.id);
      }
    });

    it.todo('should handle booking with discount code');
  });

  describe('Session Management Workflow', () => {
    it('should allow user to view their sessions', async () => {
      // Create a test session for this test
      await createSessionForTest();
      const response = await test.http.authenticatedGet('/api/sessions', userToken);

      expect(response.ok).toBe(true);
      if (response.ok) {
        const sessions = response.body.data ?? response.body;
        expect(Array.isArray(sessions)).toBe(true);
        expect(sessions).toBeDefined();
        if (Array.isArray(sessions)) {
          expect(sessions.length).toBeGreaterThan(0);
          expect(sessions[0]).toHaveProperty('id');
          expect(sessions[0]?.userId).toBe(testUser.id);
        }
      }
    });

    it('should allow coach to view their sessions', async () => {
      // Create a test session for this test
      await createSessionForTest();

      const response = await test.http.authenticatedGet('/api/sessions', coachToken);

      expect(response.ok).toBe(true);
      if (response.ok) {
        const sessions = response.body.data ?? response.body;
        expect(Array.isArray(sessions)).toBe(true);
        if (Array.isArray(sessions)) {
          expect(sessions.length).toBeGreaterThan(0);
          expect(sessions[0]?.coachId).toBe(testCoach.id);
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
      const timeSlot = await test.db.createTestTimeSlot({
        coachId: testCoach.id,
        dateTime: new Date('2025-01-15T14:00:00Z'),
        durationMin: 60,
        isAvailable: false,
      });

      const response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: timeSlot.id,
        },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should prevent unauthorized access to other users sessions', async () => {
      // Create a session for the test user
      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
      });

      // Create another user
      const otherUser = await test.db.createTestUser({
        email: 'otheruser@example.com',
      });
      const otherUserToken = await test.auth.createTestJwtToken({
        sub: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      // Try to access the test session with different user token
      const response = await test.http.authenticatedGet(
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
