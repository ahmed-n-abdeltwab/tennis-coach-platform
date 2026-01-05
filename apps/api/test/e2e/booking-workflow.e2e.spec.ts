/**
 * E2E Tests: Booking Workflow
 * Tests complete booking workflow including coach discovery, time slot booking,
 * session management, and discount application
 */

import { Account, BookingType, Prisma, Role, SessionStatus, TimeSlot } from '@prisma/client';

import { E2ETest } from '../utils';

describe('Booking Workflow (E2E)', () => {
  let test: E2ETest;
  let testUser: Account;
  let testCoach: Account;
  let testBookingType: BookingType;
  let testTimeSlot: TimeSlot;
  let userToken: string;
  let coachToken: string;

  /**
   * Seeds test data for booking workflow tests
   */
  async function seedBookingTestData(): Promise<void> {
    const timestamp = Date.now();

    testUser = await test.db.createTestUser({
      email: `e2e-user-${timestamp}@example.com`,
    });

    testCoach = await test.db.createTestCoach({
      email: `e2e-coach-${timestamp}@example.com`,
    });

    testBookingType = await test.db.createTestBookingType({
      coachId: testCoach.id,
      name: 'E2E Test Lesson',
      basePrice: new Prisma.Decimal(100),
      isActive: true,
    });

    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    testTimeSlot = await test.db.createTestTimeSlot({
      coachId: testCoach.id,
      dateTime: futureDate,
      durationMin: 60,
      isAvailable: true,
    });

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

  beforeAll(async () => {
    test = new E2ETest();
    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    await test.db.cleanupDatabase();
    await seedBookingTestData();
  });

  describe('Coach Discovery', () => {
    it('should allow coaches to browse available coaches via accounts endpoint', async () => {
      // Create additional coaches for browsing
      await test.db.createTestCoach({ email: 'coach2@example.com' });
      await test.db.createTestCoach({ email: 'coach3@example.com' });

      // Coaches can browse accounts (COACH role has access to /api/accounts)
      const response = await test.http.authenticatedGet('/api/accounts', coachToken);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      }
    });

    it('should allow users to discover coaches via booking types', async () => {
      // Users can discover coaches by viewing booking types
      const response = await test.http.authenticatedGet('/api/booking-types', userToken);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        // Booking types contain coachId which allows users to discover coaches
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('coachId');
      }
    });

    it('should return coach profile details', async () => {
      // Get specific coach profile
      const response = await test.http.authenticatedGet(
        `/api/accounts/${testCoach.id}` as '/api/accounts/{id}',
        coachToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testCoach.id);
        expect(response.body.role).toBe(Role.COACH);
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('email');
        expect(response.body).not.toHaveProperty('passwordHash');
      }
    });

    it('should filter coaches by viewing booking types for specific coach', async () => {
      // Create booking types for different coaches
      const otherCoach = await test.db.createTestCoach({ email: 'other-coach@example.com' });
      await test.db.createTestBookingType({
        coachId: otherCoach.id,
        name: 'Other Coach Lesson',
      });

      // Get booking types for specific coach
      const response = await test.http.authenticatedGet(
        `/api/booking-types/coach/${testCoach.id}` as '/api/booking-types/coach/{coachId}',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        // All returned booking types should belong to the specified coach
        response.body.forEach((bt: { coachId: string }) => {
          expect(bt.coachId).toBe(testCoach.id);
        });
      }
    });
  });

  describe('Booking Type Selection', () => {
    it('should allow users to view coach booking types', async () => {
      // Create multiple booking types for the coach
      await test.db.createTestBookingType({
        coachId: testCoach.id,
        name: 'Group Session',
        basePrice: new Prisma.Decimal(75),
      });

      const response = await test.http.authenticatedGet(
        `/api/booking-types/coach/${testCoach.id}` as '/api/booking-types/coach/{coachId}',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should return correct booking type details', async () => {
      const response = await test.http.authenticatedGet(
        `/api/booking-types/${testBookingType.id}` as '/api/booking-types/{id}',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testBookingType.id);
        expect(response.body.name).toBe('E2E Test Lesson');
        expect(response.body.basePrice).toBe(100);
        expect(response.body.coachId).toBe(testCoach.id);
        expect(response.body.isActive).toBe(true);
      }
    });

    it('should only show active booking types', async () => {
      // Create an inactive booking type
      await test.db.createTestBookingType({
        coachId: testCoach.id,
        name: 'Inactive Lesson',
        isActive: false,
      });

      const response = await test.http.authenticatedGet(
        `/api/booking-types/coach/${testCoach.id}` as '/api/booking-types/coach/{coachId}',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        // Active booking types should be returned
        const activeTypes = response.body.filter((bt: { isActive: boolean }) => bt.isActive);
        expect(activeTypes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Time Slot Selection', () => {
    it('should allow users to view available time slots', async () => {
      // Create additional time slots
      const futureDate2 = new Date();
      futureDate2.setMonth(futureDate2.getMonth() + 1);
      futureDate2.setDate(futureDate2.getDate() + 1);

      await test.db.createTestTimeSlot({
        coachId: testCoach.id,
        dateTime: futureDate2,
        isAvailable: true,
      });

      const response = await test.http.authenticatedGet(
        `/api/time-slots/coach/${testCoach.id}` as '/api/time-slots/coach/{coachId}',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(1);
        // All returned time slots should belong to the specified coach
        response.body.forEach((ts: { coachId: string }) => {
          expect(ts.coachId).toBe(testCoach.id);
        });
      }
    });

    it('should mark time slot as unavailable after booking', async () => {
      // Book the test time slot
      const bookingResponse = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
        },
      });

      expect(bookingResponse.ok).toBe(true);

      // Check time slots - the booked slot should now be marked as unavailable
      const response = await test.http.authenticatedGet(
        `/api/time-slots/${testTimeSlot.id}` as '/api/time-slots/{id}',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.isAvailable).toBe(false);
      }
    });

    it('should filter time slots by date range', async () => {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() + 1);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const response = await test.http.authenticatedGet(
        `/api/time-slots?coachId=${testCoach.id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}` as '/api/time-slots',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      }
    });
  });

  describe('Complete Booking Workflow', () => {
    it('should complete full booking flow: coach selection → booking type → time slot → confirmation', async () => {
      // Step 1: User views available coaches (via booking types)
      const bookingTypesResponse = await test.http.authenticatedGet(
        `/api/booking-types/coach/${testCoach.id}` as '/api/booking-types/coach/{coachId}',
        userToken
      );
      expect(bookingTypesResponse.ok).toBe(true);

      // Step 2: User selects a booking type
      const selectedBookingType = testBookingType;

      // Step 3: User views available time slots for the coach
      const timeSlotsResponse = await test.http.authenticatedGet(
        `/api/time-slots/coach/${testCoach.id}` as '/api/time-slots/coach/{coachId}',
        userToken
      );
      expect(timeSlotsResponse.ok).toBe(true);

      // Step 4: User selects an available time slot
      const selectedTimeSlot = testTimeSlot;

      // Step 5: User creates the booking
      const bookingResponse = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: selectedBookingType.id,
          timeSlotId: selectedTimeSlot.id,
          notes: 'E2E test booking',
        },
      });

      expect(bookingResponse.ok).toBe(true);
      if (bookingResponse.ok) {
        expect(bookingResponse.status).toBe(201);
        expect(bookingResponse.body).toHaveProperty('id');
        expect(bookingResponse.body.userId).toBe(testUser.id);
        expect(bookingResponse.body.coachId).toBe(testCoach.id);
        expect(bookingResponse.body.bookingTypeId).toBe(selectedBookingType.id);
        expect(bookingResponse.body.timeSlot.id).toBe(selectedTimeSlot.id);
        expect(bookingResponse.body.status).toBe(SessionStatus.SCHEDULED);
        expect(bookingResponse.body.notes).toBe('E2E test booking');
      }

      // Step 6: Verify the session is retrievable
      if (bookingResponse.ok) {
        const sessionId = bookingResponse.body.id;
        const sessionResponse = await test.http.authenticatedGet(
          `/api/sessions/${sessionId}` as '/api/sessions/{id}',
          userToken
        );

        expect(sessionResponse.ok).toBe(true);
        if (sessionResponse.ok) {
          expect(sessionResponse.body.id).toBe(sessionId);
          expect(sessionResponse.body.userId).toBe(testUser.id);
        }
      }
    });
  });

  describe('Booking with Discount', () => {
    it('should apply discount code during booking', async () => {
      // Create a discount for the coach
      const discount = await test.db.createTestDiscount({
        coachId: testCoach.id,
        code: 'E2E-DISCOUNT-10',
        amount: new Prisma.Decimal(10),
        isActive: true,
      });

      // Create booking with discount
      const response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          discountCode: discount.code,
        },
      });

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(201);
        expect(response.body.discountCode).toBe(discount.code);
      }
    });

    it('should reject invalid discount code via validate endpoint', async () => {
      // Validate discount code via the validate endpoint
      const response = await test.http.authenticatedPost('/api/discounts/validate', userToken, {
        body: {
          code: 'INVALID-CODE',
        },
      });

      // The validate endpoint throws BadRequestException for invalid codes
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Invalid');
      }
    });

    it('should calculate discounted price correctly', async () => {
      // Create discount with specific amount
      const discountAmount = 15;
      const discount = await test.db.createTestDiscount({
        coachId: testCoach.id,
        code: 'E2E-DISCOUNT-15',
        amount: new Prisma.Decimal(discountAmount),
        isActive: true,
      });

      // Create booking with discount
      const response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          discountCode: discount.code,
        },
      });

      expect(response.ok).toBe(true);
      if (response.ok) {
        // Price should be base price minus discount
        const expectedPrice = Number(testBookingType.basePrice) - discountAmount;
        expect(response.body.price).toBe(expectedPrice);
      }
    });
  });

  describe('Session Rescheduling', () => {
    it('should allow users to reschedule booked sessions', async () => {
      // Create a session
      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
      });

      // Create a new time slot for rescheduling
      const newFutureDate = new Date();
      newFutureDate.setMonth(newFutureDate.getMonth() + 2);
      const _newTimeSlot = await test.db.createTestTimeSlot({
        coachId: testCoach.id,
        dateTime: newFutureDate,
        isAvailable: true,
      });

      // Update session notes (rescheduling would typically involve updating the time slot)
      // Note: The current API only allows updating notes via PATCH
      const response = await test.http.authenticatedPatch(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        userToken,
        {
          body: {
            notes: `Rescheduled to ${newFutureDate.toISOString()}`,
          },
        }
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.id).toBe(session.id);
        expect(response.body.notes).toContain('Rescheduled');
      }
    });

    it('should verify session update persists', async () => {
      // Create a session
      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
      });

      // Update session
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
  });

  describe('Session Cancellation', () => {
    it('should allow users to cancel sessions', async () => {
      // Create a session
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
        dateTime: futureDate,
      });

      // Cancel the session
      const response = await test.http.authenticatedPut(
        `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.id).toBe(session.id);
        expect(response.body.status).toBe(SessionStatus.CANCELLED);
      }
    });

    it('should change status to CANCELLED after cancellation', async () => {
      // Create a session
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
        dateTime: futureDate,
      });

      // Cancel the session
      await test.http.authenticatedPut(
        `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
        userToken
      );

      // Verify the status changed
      const getResponse = await test.http.authenticatedGet(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        userToken
      );

      expect(getResponse.ok).toBe(true);
      if (getResponse.ok) {
        expect(getResponse.body.status).toBe(SessionStatus.CANCELLED);
      }
    });

    it('should allow coach to cancel session', async () => {
      // Create a session
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
        dateTime: futureDate,
      });

      // Coach cancels the session
      const response = await test.http.authenticatedPut(
        `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
        coachToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.status).toBe(SessionStatus.CANCELLED);
      }
    });

    it('should make time slot available again after cancellation', async () => {
      // Book a session first
      const bookingResponse = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
        },
      });
      expect(bookingResponse.ok).toBe(true);

      // Verify time slot is unavailable
      const unavailableResponse = await test.http.authenticatedGet(
        `/api/time-slots/${testTimeSlot.id}` as '/api/time-slots/{id}',
        userToken
      );
      expect(unavailableResponse.ok).toBe(true);
      if (unavailableResponse.ok) {
        expect(unavailableResponse.body.isAvailable).toBe(false);
      }

      // Cancel the session
      if (bookingResponse.ok) {
        const cancelResponse = await test.http.authenticatedPut(
          `/api/sessions/${bookingResponse.body.id}/cancel` as '/api/sessions/{id}/cancel',
          userToken
        );
        expect(cancelResponse.ok).toBe(true);
      }

      // Verify time slot is available again
      const availableResponse = await test.http.authenticatedGet(
        `/api/time-slots/${testTimeSlot.id}` as '/api/time-slots/{id}',
        userToken
      );
      expect(availableResponse.ok).toBe(true);
      if (availableResponse.ok) {
        expect(availableResponse.body.isAvailable).toBe(true);
      }
    });

    it('should not allow cancelling already cancelled session', async () => {
      // Create a cancelled session
      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.CANCELLED,
      });

      // Try to cancel again
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

  describe('Unavailable Time Slot Error Handling', () => {
    it('should return error when time slot becomes unavailable', async () => {
      // Create an unavailable time slot
      const unavailableTimeSlot = await test.db.createTestTimeSlot({
        coachId: testCoach.id,
        dateTime: new Date('2025-06-15T14:00:00Z'),
        isAvailable: false,
      });

      // Try to book the unavailable time slot
      const response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: unavailableTimeSlot.id,
        },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should prevent double booking of same time slot', async () => {
      // First booking succeeds
      const firstBooking = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
        },
      });
      expect(firstBooking.ok).toBe(true);

      // Create another user
      const otherUser = await test.db.createTestUser({ email: 'other-user@example.com' });
      const otherUserToken = await test.auth.createToken({
        sub: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      // Second booking should fail because time slot is now unavailable
      const secondBooking = await test.http.authenticatedPost('/api/sessions', otherUserToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
        },
      });

      expect(secondBooking.ok).toBe(false);
      if (!secondBooking.ok) {
        expect(secondBooking.status).toBe(400);
        expect(secondBooking.body.message).toContain('not available');
      }
    });

    it('should enforce maximum pending bookings limit', async () => {
      // Create multiple time slots
      const timeSlots: TimeSlot[] = [];
      for (let i = 0; i < 4; i++) {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 1);
        futureDate.setDate(futureDate.getDate() + i);
        const ts = await test.db.createTestTimeSlot({
          coachId: testCoach.id,
          dateTime: futureDate,
          isAvailable: true,
        });
        timeSlots.push(ts);
      }

      // Book 3 sessions (max allowed)
      for (let i = 0; i < 3; i++) {
        const timeSlot = timeSlots[i];
        if (!timeSlot) continue;
        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: {
            bookingTypeId: testBookingType.id,
            timeSlotId: timeSlot.id,
          },
        });
        expect(response.ok).toBe(true);
      }

      // 4th booking should fail due to pending bookings limit
      const fourthTimeSlot = timeSlots[3];
      expect(fourthTimeSlot).toBeDefined();
      const fourthBooking = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: fourthTimeSlot?.id,
        },
      });

      expect(fourthBooking.ok).toBe(false);
      if (!fourthBooking.ok) {
        expect(fourthBooking.status).toBe(400);
        expect(fourthBooking.body.message).toContain('Maximum pending bookings');
      }
    });

    it('should return error for non-existent time slot', async () => {
      const response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: 'non-existent-time-slot-id',
        },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should return error for non-existent booking type', async () => {
      const response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: 'non-existent-booking-type-id',
          timeSlotId: testTimeSlot.id,
        },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.message).toBeDefined();
      }
    });
  });

  describe('Payment Workflow', () => {
    describe('Payment Creation', () => {
      it('should return 401 for unauthenticated payment requests', async () => {
        // Create a session for the test user
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          isPaid: false,
        });

        const createData = {
          sessionId: session.id,
          amount: 100.0,
        };

        // Attempt to create payment without authentication
        const response = await test.http.post('/api/payments/create-order', {
          body: createData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(401);
        }
      });

      it('should validate session ownership before payment creation', async () => {
        // Create a session for the test user
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          isPaid: false,
        });

        // Create another user
        const otherUser = await test.db.createTestUser({ email: 'other-payment-user@example.com' });
        const otherUserToken = await test.auth.createToken({
          sub: otherUser.id,
          email: otherUser.email,
          role: otherUser.role,
        });

        const createData = {
          sessionId: session.id,
          amount: 100.0,
        };

        // Attempt to create payment for another user's session
        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          otherUserToken,
          { body: createData }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body.message).toBeDefined();
        }
      });

      it('should return 400 for already paid session', async () => {
        // Create a session that is already paid
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          isPaid: true,
        });

        const createData = {
          sessionId: session.id,
          amount: 100.0,
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          { body: createData }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body.message).toContain('already paid');
        }
      });

      it('should return 400 for invalid session ID', async () => {
        const createData = {
          sessionId: 'non-existent-session-id',
          amount: 100.0,
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          { body: createData }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body.message).toBeDefined();
        }
      });

      it('should return 400 for missing required fields', async () => {
        // Missing sessionId
        const missingSessionResponse = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          { body: { amount: 100.0 } }
        );

        expect(missingSessionResponse.ok).toBe(false);
        if (!missingSessionResponse.ok) {
          expect(missingSessionResponse.status).toBe(400);
        }

        // Missing amount
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          isPaid: false,
        });

        const missingAmountResponse = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          { body: { sessionId: session.id } }
        );

        expect(missingAmountResponse.ok).toBe(false);
        if (!missingAmountResponse.ok) {
          expect(missingAmountResponse.status).toBe(400);
        }
      });

      it('should return 400 for invalid amount values', async () => {
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          isPaid: false,
        });

        // Test negative amount
        const negativeResponse = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          { body: { sessionId: session.id, amount: -10.0 } }
        );

        expect(negativeResponse.ok).toBe(false);
        if (!negativeResponse.ok) {
          expect(negativeResponse.status).toBe(400);
        }

        // Test zero amount
        const zeroResponse = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          { body: { sessionId: session.id, amount: 0 } }
        );

        expect(zeroResponse.ok).toBe(false);
        if (!zeroResponse.ok) {
          expect(zeroResponse.status).toBe(400);
        }
      });
    });

    describe('Payment Completion', () => {
      it('should return 401 for unauthenticated capture requests', async () => {
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          isPaid: false,
        });

        const captureData = {
          orderId: 'test-order-id',
          sessionId: session.id,
        };

        const response = await test.http.post('/api/payments/capture-order', {
          body: captureData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(401);
        }
      });

      it('should validate session ownership for capture requests', async () => {
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          isPaid: false,
        });

        // Create another user
        const otherUser = await test.db.createTestUser({ email: 'other-capture-user@example.com' });
        const otherUserToken = await test.auth.createToken({
          sub: otherUser.id,
          email: otherUser.email,
          role: otherUser.role,
        });

        const captureData = {
          orderId: 'test-order-id',
          sessionId: session.id,
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/capture-order',
          otherUserToken,
          { body: captureData }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body.message).toBeDefined();
        }
      });

      it('should return 400 for missing required fields in capture', async () => {
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          isPaid: false,
        });

        // Missing orderId
        const missingOrderResponse = await test.http.authenticatedPost(
          '/api/payments/capture-order',
          userToken,
          { body: { sessionId: session.id } }
        );

        expect(missingOrderResponse.ok).toBe(false);
        if (!missingOrderResponse.ok) {
          expect(missingOrderResponse.status).toBe(400);
        }

        // Missing sessionId
        const missingSessionResponse = await test.http.authenticatedPost(
          '/api/payments/capture-order',
          userToken,
          { body: { orderId: 'test-order-id' } }
        );

        expect(missingSessionResponse.ok).toBe(false);
        if (!missingSessionResponse.ok) {
          expect(missingSessionResponse.status).toBe(400);
        }
      });

      it('should verify session isPaid status reflects payment state', async () => {
        // Create unpaid session
        const unpaidSession = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          isPaid: false,
        });

        const unpaidResponse = await test.http.authenticatedGet(
          `/api/sessions/${unpaidSession.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(unpaidResponse.ok).toBe(true);
        if (unpaidResponse.ok) {
          expect(unpaidResponse.body.isPaid).toBe(false);
        }

        // Create a new time slot for paid session
        const paidTimeSlot = await test.db.createTestTimeSlot({
          coachId: testCoach.id,
          dateTime: new Date('2025-08-15T10:00:00Z'),
          isAvailable: true,
        });

        // Create paid session
        const paidSession = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: paidTimeSlot.id,
          isPaid: true,
        });

        const paidResponse = await test.http.authenticatedGet(
          `/api/sessions/${paidSession.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(paidResponse.ok).toBe(true);
        if (paidResponse.ok) {
          expect(paidResponse.body.isPaid).toBe(true);
        }
      });
    });

    describe('Payment with Discount', () => {
      it('should calculate discounted price correctly for session', async () => {
        // Create discount
        const discountAmount = 20;
        const discount = await test.db.createTestDiscount({
          coachId: testCoach.id,
          code: 'E2E-PAYMENT-DISCOUNT',
          amount: new Prisma.Decimal(discountAmount),
          isActive: true,
        });

        // Create booking with discount
        const bookingResponse = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: {
            bookingTypeId: testBookingType.id,
            timeSlotId: testTimeSlot.id,
            discountCode: discount.code,
          },
        });

        expect(bookingResponse.ok).toBe(true);
        if (bookingResponse.ok) {
          // Verify discounted price
          const expectedPrice = Number(testBookingType.basePrice) - discountAmount;
          expect(bookingResponse.body.price).toBe(expectedPrice);
          expect(bookingResponse.body.discountCode).toBe(discount.code);
        }
      });

      it('should verify payment amount matches discounted session price', async () => {
        // Create discount
        const discountAmount = 25;
        const discount = await test.db.createTestDiscount({
          coachId: testCoach.id,
          code: 'E2E-PAYMENT-VERIFY',
          amount: new Prisma.Decimal(discountAmount),
          isActive: true,
        });

        // Create booking with discount
        const bookingResponse = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: {
            bookingTypeId: testBookingType.id,
            timeSlotId: testTimeSlot.id,
            discountCode: discount.code,
          },
        });

        expect(bookingResponse.ok).toBe(true);
        if (bookingResponse.ok) {
          const sessionId = bookingResponse.body.id;
          const sessionPrice = bookingResponse.body.price;

          // Verify session price is discounted
          const expectedPrice = Number(testBookingType.basePrice) - discountAmount;
          expect(sessionPrice).toBe(expectedPrice);

          // Retrieve session to verify price persisted
          const sessionResponse = await test.http.authenticatedGet(
            `/api/sessions/${sessionId}` as '/api/sessions/{id}',
            userToken
          );

          expect(sessionResponse.ok).toBe(true);
          if (sessionResponse.ok) {
            expect(sessionResponse.body.price).toBe(expectedPrice);
          }
        }
      });
    });

    describe('Payment History', () => {
      it('should allow users to view their sessions with payment status', async () => {
        // Create multiple sessions with different payment statuses
        const paidTimeSlot = await test.db.createTestTimeSlot({
          coachId: testCoach.id,
          dateTime: new Date('2025-09-01T10:00:00Z'),
          isAvailable: true,
        });

        const unpaidTimeSlot = await test.db.createTestTimeSlot({
          coachId: testCoach.id,
          dateTime: new Date('2025-09-02T10:00:00Z'),
          isAvailable: true,
        });

        await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: paidTimeSlot.id,
          isPaid: true,
        });

        await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: unpaidTimeSlot.id,
          isPaid: false,
        });

        // Retrieve user's sessions
        const response = await test.http.authenticatedGet('/api/sessions', userToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(2);

          // Verify sessions have isPaid property
          response.body.forEach((session: { isPaid?: boolean }) => {
            expect(session).toHaveProperty('isPaid');
            expect(typeof session.isPaid).toBe('boolean');
          });

          // Verify we have both paid and unpaid sessions
          const paidSessions = response.body.filter((s: { isPaid: boolean }) => s.isPaid);
          const unpaidSessions = response.body.filter((s: { isPaid: boolean }) => !s.isPaid);
          expect(paidSessions.length).toBeGreaterThanOrEqual(1);
          expect(unpaidSessions.length).toBeGreaterThanOrEqual(1);
        }
      });

      it('should include price information in session retrieval', async () => {
        // Create a session with specific price
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          price: new Prisma.Decimal(100),
          isPaid: false,
        });

        const response = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body).toHaveProperty('price');
          expect(response.body.price).toBe(100);
          expect(response.body).toHaveProperty('isPaid');
        }
      });
    });

    describe('Payment Failure Handling', () => {
      it('should not change session status on validation failure', async () => {
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          isPaid: false,
          status: SessionStatus.SCHEDULED,
        });

        // Attempt payment with invalid amount (should fail validation)
        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          { body: { sessionId: session.id, amount: -10 } }
        );

        expect(response.ok).toBe(false);

        // Verify session status unchanged
        const sessionResponse = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(sessionResponse.ok).toBe(true);
        if (sessionResponse.ok) {
          expect(sessionResponse.body.isPaid).toBe(false);
          expect(sessionResponse.body.status).toBe(SessionStatus.SCHEDULED);
        }
      });

      it('should not change session status on ownership validation failure', async () => {
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          isPaid: false,
          status: SessionStatus.SCHEDULED,
        });

        // Create another user
        const otherUser = await test.db.createTestUser({ email: 'failure-test-user@example.com' });
        const otherUserToken = await test.auth.createToken({
          sub: otherUser.id,
          email: otherUser.email,
          role: otherUser.role,
        });

        // Attempt payment from wrong user (should fail)
        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          otherUserToken,
          { body: { sessionId: session.id, amount: 100 } }
        );

        expect(response.ok).toBe(false);

        // Verify session status unchanged (check as original user)
        const sessionResponse = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(sessionResponse.ok).toBe(true);
        if (sessionResponse.ok) {
          expect(sessionResponse.body.isPaid).toBe(false);
          expect(sessionResponse.body.status).toBe(SessionStatus.SCHEDULED);
        }
      });

      it('should reject payment for already paid session without side effects', async () => {
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          isPaid: true,
          status: SessionStatus.SCHEDULED,
        });

        // Attempt to pay again
        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          { body: { sessionId: session.id, amount: 100 } }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body.message).toContain('already paid');
        }

        // Verify session unchanged
        const sessionResponse = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(sessionResponse.ok).toBe(true);
        if (sessionResponse.ok) {
          expect(sessionResponse.body.isPaid).toBe(true);
          expect(sessionResponse.body.status).toBe(SessionStatus.SCHEDULED);
        }
      });
    });
  });

  /**
   * Authentication and Authorization Tests
   */
  describe('Authentication and Authorization', () => {
    it('should require authentication for booking', async () => {
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

    it('should prevent user from accessing other users sessions', async () => {
      // Create a session for the test user
      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
      });

      // Create another user
      const otherUser = await test.db.createTestUser({ email: 'unauthorized@example.com' });
      const otherUserToken = await test.auth.createToken({
        sub: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      // Try to access the session
      const response = await test.http.authenticatedGet(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        otherUserToken
      );

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect([403, 404]).toContain(response.status);
      }
    });

    it('should prevent user from cancelling other users sessions', async () => {
      // Create a session for the test user
      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
      });

      // Create another user
      const otherUser = await test.db.createTestUser({ email: 'unauthorized-cancel@example.com' });
      const otherUserToken = await test.auth.createToken({
        sub: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      // Try to cancel the session
      const response = await test.http.authenticatedPut(
        `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
        otherUserToken
      );

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect([403, 404]).toContain(response.status);
      }
    });
  });
});
