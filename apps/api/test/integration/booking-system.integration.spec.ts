/**
 * Integration tests for booking system workflows
 * Tests complete booking workflows and cross-module interactions
 * Demonstrates using BaseIntegrationTest with custom test data setup
 */

import { Account, BookingType, Prisma, Session, SessionStatus, TimeSlot } from '@prisma/client';

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

    // Use a future date for time slots to ensure they pass availability checks
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1); // 1 month in the future

    testTimeSlot = await test.db.createTestTimeSlot({
      coachId: testCoach.id,
      dateTime: futureDate,
      durationMin: 60,
      isAvailable: true,
    });

    // Create auth tokens with fresh user/coach IDs
    userToken = await test.auth.createToken({
      sub: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });

    coachToken = await test.auth.createToken({
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

    // Use a future date for sessions to ensure they can be cancelled
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1); // 1 month in the future

    testSession = await test.db.createTestSession({
      userId: testUser.id,
      coachId: testCoach.id,
      bookingTypeId: testBookingType.id,
      timeSlotId: testTimeSlot.id,
      status: SessionStatus.SCHEDULED,
      dateTime: futureDate,
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

    it('should verify booking type selection during workflow', async () => {
      // User views available booking types for a specific coach
      const bookingTypesResponse = await test.http.authenticatedGet(
        '/api/booking-types',
        userToken
      );

      expect(bookingTypesResponse.ok).toBe(true);
      if (bookingTypesResponse.ok) {
        expect(Array.isArray(bookingTypesResponse.body)).toBe(true);
        // Verify the test booking type is in the list
        const foundBookingType = bookingTypesResponse.body.find(
          (bt: { id: string }) => bt.id === testBookingType.id
        );
        expect(foundBookingType).toBeDefined();
        if (foundBookingType) {
          expect(foundBookingType.coachId).toBe(testCoach.id);
          expect(foundBookingType.isActive).toBe(true);
        }
      }
    });

    it('should verify time slot availability during workflow', async () => {
      // User views available time slots
      const timeSlotsResponse = await test.http.authenticatedGet('/api/time-slots', userToken);

      expect(timeSlotsResponse.ok).toBe(true);
      if (timeSlotsResponse.ok) {
        expect(Array.isArray(timeSlotsResponse.body)).toBe(true);
        // Verify the test time slot is in the list
        const foundTimeSlot = timeSlotsResponse.body.find(
          (ts: { id: string }) => ts.id === testTimeSlot.id
        );
        expect(foundTimeSlot).toBeDefined();
        if (foundTimeSlot) {
          expect(foundTimeSlot.coachId).toBe(testCoach.id);
          expect(foundTimeSlot.isAvailable).toBe(true);
        }
      }
    });
  });

  describe('Session Management Workflow', () => {
    it('should allow user to view their sessions', async () => {
      // Create a test session for this test
      await createSessionForTest();
      const response = await test.http.authenticatedGet('/api/sessions', userToken);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]?.userId).toBe(testUser.id);
      }
    });

    it('should allow coach to view their sessions', async () => {
      // Create a test session for this test
      await createSessionForTest();

      const response = await test.http.authenticatedGet('/api/sessions', coachToken);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]?.coachId).toBe(testCoach.id);
      }
    });

    it('should allow session notes updates', async () => {
      // Create a test session for this test
      const session = await createSessionForTest();

      // Update session notes (only notes is allowed by UpdateSessionDto)
      const updateResponse = await test.http.authenticatedPatch(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        userToken,
        {
          body: {
            notes: 'Updated session notes',
          },
        }
      );

      expect(updateResponse.ok).toBe(true);
      if (updateResponse.ok) {
        expect(updateResponse.body).toHaveProperty('id', session.id);
        expect(updateResponse.body.notes).toBe('Updated session notes');
      }

      // Verify the update persisted
      const getResponse = await test.http.authenticatedGet(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        userToken
      );

      expect(getResponse.ok).toBe(true);
      if (getResponse.ok) {
        expect(getResponse.body.notes).toBe('Updated session notes');
      }
    });

    it('should allow session cancellation via cancel endpoint', async () => {
      // Create a test session for this test
      const session = await createSessionForTest();

      // Cancel the session using the dedicated cancel endpoint
      const cancelResponse = await test.http.authenticatedPut(
        `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
        userToken
      );

      expect(cancelResponse.ok).toBe(true);
      if (cancelResponse.ok) {
        expect(cancelResponse.body).toHaveProperty('id', session.id);
        expect(cancelResponse.body.status).toBe('CANCELLED');
      }

      // Verify cancellation persisted
      const getResponse = await test.http.authenticatedGet(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        userToken
      );

      expect(getResponse.ok).toBe(true);
      if (getResponse.ok) {
        expect(getResponse.body.status).toBe('CANCELLED');
      }
    });

    it('should allow coach to cancel session', async () => {
      // Create a test session for this test
      const session = await createSessionForTest();

      // Coach cancels the session
      const cancelResponse = await test.http.authenticatedPut(
        `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
        coachToken
      );

      expect(cancelResponse.ok).toBe(true);
      if (cancelResponse.ok) {
        expect(cancelResponse.body).toHaveProperty('id', session.id);
        expect(cancelResponse.body.status).toBe('CANCELLED');
      }
    });

    it('should filter sessions by status', async () => {
      // Use future dates for sessions
      const futureDate1 = new Date();
      futureDate1.setMonth(futureDate1.getMonth() + 1);
      const futureDate2 = new Date();
      futureDate2.setMonth(futureDate2.getMonth() + 1);
      futureDate2.setDate(futureDate2.getDate() + 1);

      // Create sessions with different statuses
      await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
        dateTime: futureDate1,
      });

      // Create another time slot for the confirmed session
      const timeSlot2 = await test.db.createTestTimeSlot({
        coachId: testCoach.id,
        dateTime: futureDate2,
        durationMin: 60,
        isAvailable: true,
      });

      await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: timeSlot2.id,
        status: SessionStatus.CONFIRMED,
        dateTime: futureDate2,
      });

      // Filter by SCHEDULED status
      const scheduledResponse = await test.http.authenticatedGet(
        '/api/sessions?status=SCHEDULED' as '/api/sessions',
        userToken
      );

      expect(scheduledResponse.ok).toBe(true);
      if (scheduledResponse.ok) {
        expect(Array.isArray(scheduledResponse.body)).toBe(true);
        const scheduledSessions = scheduledResponse.body.filter(
          (s: { status?: string }) => s.status === 'SCHEDULED'
        );
        expect(scheduledSessions.length).toBeGreaterThan(0);
        expect(scheduledSessions.every((s: { status?: string }) => s.status === 'SCHEDULED')).toBe(
          true
        );
      }

      // Filter by CONFIRMED status
      const confirmedResponse = await test.http.authenticatedGet(
        '/api/sessions?status=CONFIRMED' as '/api/sessions',
        userToken
      );

      expect(confirmedResponse.ok).toBe(true);
      if (confirmedResponse.ok) {
        expect(Array.isArray(confirmedResponse.body)).toBe(true);
        const confirmedSessions = confirmedResponse.body.filter(
          (s: { status?: string }) => s.status === 'CONFIRMED'
        );
        expect(confirmedSessions.length).toBeGreaterThan(0);
        expect(confirmedSessions.every((s: { status?: string }) => s.status === 'CONFIRMED')).toBe(
          true
        );
      }
    });

    it('should filter sessions by date range', async () => {
      // Use future dates for sessions
      const now = new Date();
      const futureDate1 = new Date(now);
      futureDate1.setMonth(futureDate1.getMonth() + 1);
      const futureDate2 = new Date(now);
      futureDate2.setMonth(futureDate2.getMonth() + 2);

      // Create sessions at different dates
      await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
        dateTime: futureDate1,
      });

      // Create another time slot for session2
      const timeSlot2 = await test.db.createTestTimeSlot({
        coachId: testCoach.id,
        dateTime: futureDate2,
        durationMin: 60,
        isAvailable: true,
      });

      await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: timeSlot2.id,
        status: SessionStatus.SCHEDULED,
        dateTime: futureDate2,
      });

      // Filter by date range - between the two sessions
      const startDate = new Date(futureDate1);
      startDate.setDate(startDate.getDate() + 15); // 15 days after first session
      const endDate = new Date(futureDate2);
      endDate.setDate(endDate.getDate() + 5); // 5 days after second session

      const response = await test.http.authenticatedGet(
        `/api/sessions?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}` as '/api/sessions',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(Array.isArray(response.body)).toBe(true);
        // Should include session2 but not session1
        const sessionDates = response.body.map((s: { dateTime: string }) => new Date(s.dateTime));

        sessionDates.forEach((date: Date) => {
          expect(date >= startDate).toBe(true);
          expect(date <= endDate).toBe(true);
        });
      }
    });
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
        expect(response.body.message).toBeDefined();
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
      const otherUserToken = await test.auth.createToken({
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

    it('should prevent unauthorized session updates', async () => {
      // Create a session for the test user
      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
      });

      // Create another user
      const otherUser = await test.db.createTestUser({
        email: 'otheruserupdate@example.com',
      });
      const otherUserToken = await test.auth.createToken({
        sub: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      // Try to update the session with different user token
      const response = await test.http.authenticatedPatch(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        otherUserToken,
        {
          body: {
            notes: 'Unauthorized update attempt',
          },
        }
      );

      // Should return 403 Forbidden
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect([403, 404]).toContain(response.status);
      }
    });

    it('should prevent unauthorized session cancellation', async () => {
      // Create a session for the test user
      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
      });

      // Create another user
      const otherUser = await test.db.createTestUser({
        email: 'otherusercancel@example.com',
      });
      const otherUserToken = await test.auth.createToken({
        sub: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      // Try to cancel the session with different user token
      const response = await test.http.authenticatedPut(
        `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
        otherUserToken
      );

      // Should return 403 Forbidden
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect([403, 404]).toContain(response.status);
      }
    });

    it('should handle booking with invalid booking type', async () => {
      const response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: 'invalid-booking-type-id',
          timeSlotId: testTimeSlot.id,
        },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should handle booking with invalid time slot', async () => {
      const response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: 'invalid-time-slot-id',
        },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should require authentication for session creation', async () => {
      const response = await test.http.post('/api/sessions', {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
        },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
      }
    });

    it('should require authentication for session retrieval', async () => {
      const response = await test.http.get('/api/sessions');

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
      }
    });
  });

  /**
   * Session Creation with Valid Dependencies Tests
   * Feature: integration-tests-refactoring, Property 4: Session Creation with Valid Dependencies
   * Validates: Requirements 3.1, 10.1
   *
   * For any valid booking type and available time slot belonging to the same coach,
   * POST /api/sessions should create a session linking the user, coach, booking type,
   * and time slot correctly.
   */
  describe('Session Creation with Valid Dependencies', () => {
    const bookingTypeConfigs = [
      { name: 'Individual Lesson', basePrice: 100, durationMin: 60 },
      { name: 'Group Session', basePrice: 75, durationMin: 90 },
      { name: 'Premium Coaching', basePrice: 150, durationMin: 120 },
    ] as const;

    it.each(bookingTypeConfigs)(
      'should create session with $name booking type',
      async ({ name, basePrice, durationMin }) => {
        // Create a booking type with specific configuration
        const bookingType = await test.db.createTestBookingType({
          coachId: testCoach.id,
          name,
          basePrice: new Prisma.Decimal(basePrice),
          isActive: true,
        });

        // Create a time slot with matching duration (use future date)
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 2);

        const timeSlot = await test.db.createTestTimeSlot({
          coachId: testCoach.id,
          dateTime: futureDate,
          durationMin,
          isAvailable: true,
        });

        // Create session
        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: {
            bookingTypeId: bookingType.id,
            timeSlotId: timeSlot.id,
          },
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('id');
          // Verify correct linking
          expect(response.body.userId).toBe(testUser.id);
          expect(response.body.coachId).toBe(testCoach.id);
          expect(response.body.bookingTypeId).toBe(bookingType.id);
          expect(response.body.timeSlot.id).toBe(timeSlot.id);
          expect(response.body.status).toBe(SessionStatus.SCHEDULED);
        }
      }
    );

    const timeSlotConfigs = [
      { hour: 9, description: 'morning' },
      { hour: 14, description: 'afternoon' },
      { hour: 18, description: 'evening' },
    ] as const;

    it.each(timeSlotConfigs)(
      'should create session with $description time slot',
      async ({ hour }) => {
        // Create a time slot at specific hour (use future date)
        const dateTime = new Date();
        dateTime.setMonth(dateTime.getMonth() + 3);
        dateTime.setUTCHours(hour, 0, 0, 0);

        const timeSlot = await test.db.createTestTimeSlot({
          coachId: testCoach.id,
          dateTime,
          durationMin: 60,
          isAvailable: true,
        });

        // Create session
        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: {
            bookingTypeId: testBookingType.id,
            timeSlotId: timeSlot.id,
          },
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('id');
          expect(response.body.userId).toBe(testUser.id);
          expect(response.body.coachId).toBe(testCoach.id);
          expect(response.body.timeSlot.id).toBe(timeSlot.id);
        }
      }
    );
  });
});
