import { SessionStatus } from '@prisma/client';

import { BookingTypesModule } from '../../src/app/booking-types/booking-types.module';
import { DiscountsModule } from '../../src/app/discounts/discounts.module';
import { IamModule } from '../../src/app/iam/iam.module';
import { SessionsModule } from '../../src/app/sessions/sessions.module';
import { TimeSlotsModule } from '../../src/app/time-slots/time-slots.module';
import { IntegrationTest } from '../utils';

/**
 * Sessions Module Integration Tests
 * Tests session creation, retrieval, update, and cancellation workflows
 */
describe('Sessions Integration', () => {
  let test: IntegrationTest;
  let userToken: string;
  let coachToken: string;
  let userId: string;
  let coachId: string;

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [SessionsModule, BookingTypesModule, TimeSlotsModule, DiscountsModule, IamModule],
    });
    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    // Clean database before each test
    await test.db.cleanupDatabase();

    // Create test users
    const user = await test.db.createTestUser();
    const coach = await test.db.createTestCoach();

    userId = user.id;
    coachId = coach.id;

    // Create tokens
    userToken = await test.auth.createToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    coachToken = await test.auth.createToken({
      sub: coach.id,
      email: coach.email,
      role: coach.role,
    });
  });

  describe('Session Creation Workflows', () => {
    describe('POST /api/sessions', () => {
      it('should create session with valid booking type and time slot', async () => {
        // Create test data
        const bookingType = await test.db.createTestBookingType({ coachId });
        const timeSlot = await test.db.createTestTimeSlot({ coachId, isAvailable: true });

        const createData = {
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          notes: 'Test session notes',
        };

        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: createData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('id');
          expect(response.body.bookingTypeId).toBe(bookingType.id);
          expect(response.body.timeSlot.id).toBe(timeSlot.id);
          expect(response.body.userId).toBe(userId);
          expect(response.body.coachId).toBe(coachId);
          expect(response.body.notes).toBe('Test session notes');
          expect(response.body.status).toBe(SessionStatus.SCHEDULED);
          expect(response.body.isPaid).toBe(false);
        }
      });

      it('should create session with discount code', async () => {
        // Create test data
        const bookingType = await test.db.createTestBookingType({ coachId });
        const timeSlot = await test.db.createTestTimeSlot({ coachId, isAvailable: true });
        const discount = await test.db.createTestDiscount({ coachId, isActive: true });

        const createData = {
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          discountCode: discount.code,
        };

        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: createData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('id');
          expect(response.body.discountCode).toBe(discount.code);
        }
      });

      it('should fail to create session with invalid booking type', async () => {
        const timeSlot = await test.db.createTestTimeSlot({ coachId, isAvailable: true });

        const createData = {
          bookingTypeId: 'non-existent-booking-type',
          timeSlotId: timeSlot.id,
        };

        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: createData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body.message).toBeDefined();
        }
      });

      it('should fail to create session with invalid time slot', async () => {
        const bookingType = await test.db.createTestBookingType({ coachId });

        const createData = {
          bookingTypeId: bookingType.id,
          timeSlotId: 'non-existent-time-slot',
        };

        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: createData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body.message).toBeDefined();
        }
      });

      it('should fail to create session with unavailable time slot', async () => {
        const bookingType = await test.db.createTestBookingType({ coachId });
        const timeSlot = await test.db.createTestTimeSlot({ coachId, isAvailable: false });

        const createData = {
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
        };

        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: createData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body.message).toBeDefined();
        }
      });

      it('should fail to create session without authentication', async () => {
        const bookingType = await test.db.createTestBookingType({ coachId });
        const timeSlot = await test.db.createTestTimeSlot({ coachId, isAvailable: true });

        const createData = {
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
        };

        const response = await test.http.post('/api/sessions', {
          body: createData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(401);
        }
      });
    });
  });

  describe('Session Retrieval and Filtering', () => {
    describe('GET /api/sessions', () => {
      it('should retrieve user own sessions', async () => {
        // Create sessions for the user
        await test.db.createTestSession({ userId, coachId });
        await test.db.createTestSession({ userId, coachId });

        const response = await test.http.authenticatedGet('/api/sessions', userToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(2);
          response.body.forEach((session: { userId: string }) => {
            expect(session.userId).toBe(userId);
          });
        }
      });

      it('should retrieve coach sessions', async () => {
        // Create sessions for the coach
        await test.db.createTestSession({ userId, coachId });
        await test.db.createTestSession({ userId, coachId });

        const response = await test.http.authenticatedGet('/api/sessions', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(2);
          response.body.forEach((session: { coachId: string }) => {
            expect(session.coachId).toBe(coachId);
          });
        }
      });

      it('should filter sessions by status', async () => {
        // Create sessions with different statuses
        await test.db.createTestSession({ userId, coachId, status: SessionStatus.SCHEDULED });
        await test.db.createTestSession({ userId, coachId, status: SessionStatus.CONFIRMED });
        await test.db.createTestSession({ userId, coachId, status: SessionStatus.CANCELLED });

        const response = await test.http.authenticatedGet(
          `/api/sessions?status=${SessionStatus.SCHEDULED}` as '/api/sessions',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          response.body.forEach((session: { status?: string }) => {
            expect(session.status).toBe(SessionStatus.SCHEDULED);
          });
        }
      });

      it('should filter sessions by date range', async () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);

        // Create sessions at different dates
        await test.db.createTestSession({ userId, coachId, dateTime: tomorrow });
        await test.db.createTestSession({ userId, coachId, dateTime: nextWeek });

        const startDate = now.toISOString();
        const endDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

        const response = await test.http.authenticatedGet(
          `/api/sessions?startDate=${startDate}&endDate=${endDate}` as '/api/sessions',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          // Should only include sessions within the date range
          response.body.forEach((session: { dateTime: string }) => {
            const sessionDate = new Date(session.dateTime);
            expect(sessionDate.getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
            expect(sessionDate.getTime()).toBeLessThanOrEqual(new Date(endDate).getTime());
          });
        }
      });

      it('should not retrieve other users sessions', async () => {
        // Create another user and their session
        const otherUser = await test.db.createTestUser();
        await test.db.createTestSession({ userId: otherUser.id, coachId });

        // Create session for current user
        await test.db.createTestSession({ userId, coachId });

        const response = await test.http.authenticatedGet('/api/sessions', userToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          // Should only see own sessions
          response.body.forEach((session: { userId: string }) => {
            expect(session.userId).toBe(userId);
            expect(session.userId).not.toBe(otherUser.id);
          });
        }
      });
    });

    describe('GET /api/sessions/:id', () => {
      it('should retrieve session by ID', async () => {
        const session = await test.db.createTestSession({ userId, coachId });

        const response = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(session.id);
          expect(response.body.userId).toBe(userId);
          expect(response.body.coachId).toBe(coachId);
        }
      });

      it('should allow coach to retrieve their session', async () => {
        const session = await test.db.createTestSession({ userId, coachId });

        const response = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          coachToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(session.id);
          expect(response.body.coachId).toBe(coachId);
        }
      });

      it('should return 404 for non-existent session', async () => {
        const response = await test.http.authenticatedGet(
          '/api/sessions/cnonexistentsession123' as '/api/sessions/{id}',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(404);
          expect(response.body.message).toContain('not found');
        }
      });

      it('should prevent user from accessing other users sessions', async () => {
        const otherUser = await test.db.createTestUser();
        const session = await test.db.createTestSession({ userId: otherUser.id, coachId });

        const response = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(403);
        }
      });
    });
  });

  describe('Session Updates and Cancellation', () => {
    describe('PUT /api/sessions/:id', () => {
      it('should allow user to update their own session', async () => {
        const session = await test.db.createTestSession({ userId, coachId });

        const updateData = {
          notes: 'Updated session notes',
        };

        const response = await test.http.authenticatedPut(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken,
          {
            body: updateData,
          }
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(session.id);
          expect(response.body.notes).toBe('Updated session notes');
        }
      });

      it('should allow coach to update session notes', async () => {
        const session = await test.db.createTestSession({
          userId,
          coachId,
          status: SessionStatus.SCHEDULED,
        });

        const updateData = {
          notes: 'Coach updated notes',
        };

        const response = await test.http.authenticatedPut(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          coachToken,
          {
            body: updateData,
          }
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(session.id);
          expect(response.body.notes).toBe('Coach updated notes');
        }
      });

      it('should prevent user from updating other users sessions', async () => {
        const otherUser = await test.db.createTestUser();
        const session = await test.db.createTestSession({ userId: otherUser.id, coachId });

        const updateData = {
          notes: 'Unauthorized update',
        };

        const response = await test.http.authenticatedPut(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken,
          {
            body: updateData,
          }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(403);
        }
      });

      it('should return 404 when updating non-existent session', async () => {
        const updateData = {
          notes: 'Updated notes',
        };

        const response = await test.http.authenticatedPut(
          '/api/sessions/cnonexistentsession123' as '/api/sessions/{id}',
          userToken,
          {
            body: updateData,
          }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(404);
        }
      });
    });

    describe('PATCH /api/sessions/:id', () => {
      it('should allow partial update of session notes', async () => {
        const session = await test.db.createTestSession({ userId, coachId });

        const updateData = {
          notes: 'Partially updated notes',
        };

        const response = await test.http.authenticatedPatch(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          coachToken,
          {
            body: updateData,
          }
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(session.id);
          expect(response.body.notes).toBe('Partially updated notes');
        }
      });
    });

    describe('PUT /api/sessions/:id/cancel', () => {
      it('should allow user to cancel their own session', async () => {
        const session = await test.db.createTestSession({
          userId,
          coachId,
          status: SessionStatus.SCHEDULED,
        });

        const response = await test.http.authenticatedPut(
          `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(session.id);
          expect(response.body.status).toBe(SessionStatus.CANCELLED);
        }
      });

      it('should allow coach to cancel session', async () => {
        const session = await test.db.createTestSession({
          userId,
          coachId,
          status: SessionStatus.SCHEDULED,
        });

        const response = await test.http.authenticatedPut(
          `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
          coachToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(session.id);
          expect(response.body.status).toBe(SessionStatus.CANCELLED);
        }
      });

      it('should prevent user from cancelling other users sessions', async () => {
        const otherUser = await test.db.createTestUser();
        const session = await test.db.createTestSession({
          userId: otherUser.id,
          coachId,
          status: SessionStatus.SCHEDULED,
        });

        const response = await test.http.authenticatedPut(
          `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(403);
        }
      });

      it('should return 404 when cancelling non-existent session', async () => {
        const response = await test.http.authenticatedPut(
          '/api/sessions/cnonexistentsession123/cancel' as '/api/sessions/{id}/cancel',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(404);
        }
      });
    });
  });

  describe('Session Filtering Consistency', () => {
    const statusTestCases = [
      { status: SessionStatus.SCHEDULED, description: 'SCHEDULED' },
      { status: SessionStatus.CONFIRMED, description: 'CONFIRMED' },
      { status: SessionStatus.COMPLETED, description: 'COMPLETED' },
      { status: SessionStatus.CANCELLED, description: 'CANCELLED' },
    ] as const;

    it.each(statusTestCases)(
      'should filter sessions by $description status correctly',
      async ({ status }) => {
        // Create sessions with different statuses
        await test.db.createTestSession({ userId, coachId, status: SessionStatus.SCHEDULED });
        await test.db.createTestSession({ userId, coachId, status: SessionStatus.CONFIRMED });
        await test.db.createTestSession({ userId, coachId, status: SessionStatus.COMPLETED });
        await test.db.createTestSession({ userId, coachId, status: SessionStatus.CANCELLED });

        const response = await test.http.authenticatedGet(
          `/api/sessions?status=${status}` as '/api/sessions',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          // All returned sessions should match the filter
          response.body.forEach((session: { status?: string; userId: string }) => {
            expect(session.status).toBe(status);
            expect(session.userId).toBe(userId);
          });
        }
      }
    );
  });

  describe('Session State Transitions', () => {
    const cancellableStatuses = [
      { status: SessionStatus.SCHEDULED, canCancel: true, description: 'SCHEDULED' },
      { status: SessionStatus.CONFIRMED, canCancel: true, description: 'CONFIRMED' },
    ] as const;

    it.each(cancellableStatuses)(
      'should transition $description session to CANCELLED',
      async ({ status }) => {
        const session = await test.db.createTestSession({
          userId,
          coachId,
          status,
        });

        // Cancel the session
        const cancelResponse = await test.http.authenticatedPut(
          `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
          userToken
        );

        expect(cancelResponse.ok).toBe(true);
        if (cancelResponse.ok) {
          expect(cancelResponse.body.status).toBe(SessionStatus.CANCELLED);
        }

        // Verify the session is still retrievable with updated status
        const getResponse = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(getResponse.ok).toBe(true);
        if (getResponse.ok) {
          expect(getResponse.body.id).toBe(session.id);
          expect(getResponse.body.status).toBe(SessionStatus.CANCELLED);
        }
      }
    );

    it('should not allow cancelling already cancelled session', async () => {
      const session = await test.db.createTestSession({
        userId,
        coachId,
        status: SessionStatus.CANCELLED,
      });

      const response = await test.http.authenticatedPut(
        `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
        userToken
      );

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('already cancelled');
      }
    });
  });
});
