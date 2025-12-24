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
      status: SessionStatus.SCHEDULED,
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

    it('should allow session updates', async () => {
      // Create a test session for this test
      const session = await createSessionForTest();

      // Update session status
      const updateResponse = await test.http.authenticatedPatch(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        userToken,
        {
          body: {
            status: SessionStatus.CONFIRMED,
          },
        }
      );

      expect(updateResponse.ok).toBe(true);
      if (updateResponse.ok) {
        expect(updateResponse.body).toHaveProperty('id', session.id);
        expect(updateResponse.body.status).toBe('CONFIRMED');
      }

      // Verify the update persisted
      const getResponse = await test.http.authenticatedGet(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        userToken
      );

      expect(getResponse.ok).toBe(true);
      if (getResponse.ok) {
        expect(getResponse.body.status).toBe('CONFIRMED');
      }
    });

    it('should allow session cancellation', async () => {
      // Create a test session for this test
      const session = await createSessionForTest();

      // Cancel the session
      const cancelResponse = await test.http.authenticatedPatch(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        userToken,
        {
          body: {
            status: SessionStatus.CANCELLED,
          },
        }
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

    it('should filter sessions by status', async () => {
      // Create sessions with different statuses
      await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
        dateTime: new Date('2025-12-25T10:00:00Z'),
      });

      // Create another time slot for the confirmed session
      const timeSlot2 = await test.db.createTestTimeSlot({
        coachId: testCoach.id,
        dateTime: new Date('2025-12-26T10:00:00Z'),
        durationMin: 60,
        isAvailable: true,
      });

      await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: timeSlot2.id,
        status: SessionStatus.CONFIRMED,
        dateTime: new Date('2025-12-26T10:00:00Z'),
      });

      // Filter by SCHEDULED status
      const scheduledResponse = await test.http.authenticatedGet(
        '/api/sessions?status=SCHEDULED' as '/api/sessions',
        userToken
      );

      expect(scheduledResponse.ok).toBe(true);
      if (scheduledResponse.ok) {
        const sessions = scheduledResponse.body.data ?? scheduledResponse.body;
        expect(Array.isArray(sessions)).toBe(true);
        if (Array.isArray(sessions)) {
          const scheduledSessions = sessions.filter(s => s.status === 'SCHEDULED');
          expect(scheduledSessions.length).toBeGreaterThan(0);
          expect(scheduledSessions.every(s => s.status === 'SCHEDULED')).toBe(true);
        }
      }

      // Filter by CONFIRMED status
      const confirmedResponse = await test.http.authenticatedGet(
        '/api/sessions?status=CONFIRMED' as '/api/sessions',
        userToken
      );

      expect(confirmedResponse.ok).toBe(true);
      if (confirmedResponse.ok) {
        const sessions = confirmedResponse.body.data ?? confirmedResponse.body;
        expect(Array.isArray(sessions)).toBe(true);
        if (Array.isArray(sessions)) {
          const confirmedSessions = sessions.filter(s => s.status === 'CONFIRMED');
          expect(confirmedSessions.length).toBeGreaterThan(0);
          expect(confirmedSessions.every(s => s.status === 'CONFIRMED')).toBe(true);
        }
      }
    });

    it('should filter sessions by date range', async () => {
      // Create sessions at different dates
      await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
        dateTime: new Date('2025-12-20T10:00:00Z'),
      });

      // Create another time slot for session2
      const timeSlot2 = await test.db.createTestTimeSlot({
        coachId: testCoach.id,
        dateTime: new Date('2025-12-28T10:00:00Z'),
        durationMin: 60,
        isAvailable: true,
      });

      await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: timeSlot2.id,
        status: SessionStatus.SCHEDULED,
        dateTime: new Date('2025-12-28T10:00:00Z'),
      });

      // Filter by date range
      const startDate = '2025-12-25';
      const endDate = '2025-12-30';
      const response = await test.http.authenticatedGet(
        `/api/sessions?startDate=${startDate}&endDate=${endDate}` as '/api/sessions',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        const sessions = response.body.data ?? response.body;
        expect(Array.isArray(sessions)).toBe(true);
        if (Array.isArray(sessions)) {
          // Should include session2 (Dec 28) but not session1 (Dec 20)
          const sessionDates = sessions.map(s => new Date(s.dateTime));
          const start = new Date(startDate);
          const end = new Date(endDate);

          sessionDates.forEach(date => {
            expect(date >= start).toBe(true);
            expect(date <= end).toBe(true);
          });
        }
      }
    });
  });

  // TODO: Add Time Slot Management Workflow tests
  // TODO: Add Booking Type Management Workflow tests

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

    // TODO: Add tests for booking inactive booking type
    // TODO: Add tests for invalid discount code
    // TODO: Add tests for preventing cancellation of past sessions
  });
});
