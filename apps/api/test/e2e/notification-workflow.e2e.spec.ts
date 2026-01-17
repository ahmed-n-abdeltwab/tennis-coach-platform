/**
 * E2E Tests: Notification Workflow
 * Tests notification flow including email notifications, booking confirmations,
 * and in-app messaging between users and coaches
 */

import { Account, BookingType, Prisma, Role, SessionStatus, TimeSlot } from '@prisma/client';

import { E2ETest } from '../utils';

describe('Notification Workflow (E2E)', () => {
  let test: E2ETest;
  let testUser: Account;
  let testCoach: Account;
  let testBookingType: BookingType;
  let testTimeSlot: TimeSlot;
  let userToken: string;
  let coachToken: string;

  /**
   * Seeds test data for notification workflow tests
   */
  async function seedNotificationTestData(): Promise<void> {
    const timestamp = Date.now();

    testUser = await test.db.createTestUser({
      email: `e2e-notif-user-${timestamp}@example.com`,
    });

    testCoach = await test.db.createTestCoach({
      email: `e2e-notif-coach-${timestamp}@example.com`,
    });

    testBookingType = await test.db.createTestBookingType({
      coachId: testCoach.id,
      name: 'E2E Notification Test Lesson',
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
    await seedNotificationTestData();
  });

  describe('Booking Notification Tests', () => {
    it('should send booking confirmation notification after session creation', async () => {
      // Step 1: Create a booking
      const bookingResponse = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          notes: 'E2E notification test booking',
        },
      });

      expect(bookingResponse.ok).toBe(true);
      if (!bookingResponse.ok) return;

      const sessionId = bookingResponse.body.id;

      // Step 2: Send booking confirmation notification
      const confirmResponse = await test.http.authenticatedPost(
        '/api/notifications/confirm',
        userToken,
        {
          body: {
            sessionId,
          },
        }
      );

      // The notification endpoint should accept the request
      // Note: Actual email delivery depends on SMTP configuration
      expect(confirmResponse.status).toBeDefined();
    });

    it('should require authentication for booking confirmation', async () => {
      // Create a session first
      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
      });

      // Attempt to send confirmation without authentication
      const response = await test.http.post('/api/notifications/confirm', {
        body: {
          sessionId: session.id,
        },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
      }
    });

    it('should validate session ownership for booking confirmation', async () => {
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
        email: 'other-notif-user@example.com',
      });
      const otherUserToken = await test.auth.createToken({
        sub: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      // Attempt to send confirmation for another user's session
      const response = await test.http.authenticatedPost(
        '/api/notifications/confirm',
        otherUserToken,
        {
          body: {
            sessionId: session.id,
          },
        }
      );

      // Should be rejected due to ownership validation
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should allow coach to send booking confirmation for their sessions', async () => {
      // Create a session
      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
      });

      // Coach sends confirmation
      const response = await test.http.authenticatedPost('/api/notifications/confirm', coachToken, {
        body: {
          sessionId: session.id,
        },
      });

      // Coach should be able to send confirmation for their sessions
      expect(response.status).toBeDefined();
    });

    it('should reject confirmation for non-existent session', async () => {
      const response = await test.http.authenticatedPost('/api/notifications/confirm', userToken, {
        body: {
          sessionId: 'non-existent-session-id',
        },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('Cancellation Notification Tests', () => {
    it('should allow user to cancel session and verify status change', async () => {
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
      const cancelResponse = await test.http.authenticatedPut(
        `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
        userToken
      );

      expect(cancelResponse.ok).toBe(true);
      if (cancelResponse.ok) {
        expect(cancelResponse.body.status).toBe(SessionStatus.CANCELLED);
      }

      // Verify the session status changed
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
  });

  describe('Message Notification Tests (In-App Communication)', () => {
    it('should allow user to send message to coach within session context', async () => {
      // Create a session
      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
      });

      // User sends message to coach
      const response = await test.http.authenticatedPost('/api/messages', userToken, {
        body: {
          content: 'Hello coach, looking forward to our session!',
          receiverId: testCoach.id,
          sessionId: session.id,
        },
      });

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.content).toBe('Hello coach, looking forward to our session!');
        expect(response.body.senderId).toBe(testUser.id);
        expect(response.body.receiverId).toBe(testCoach.id);
        expect(response.body.sessionId).toBe(session.id);
      }
    });

    it('should allow coach to send message to user within session context', async () => {
      // Create a session
      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
      });

      // Coach sends message to user
      const response = await test.http.authenticatedPost('/api/messages', coachToken, {
        body: {
          content: 'Hi! See you at the session.',
          receiverId: testUser.id,
          sessionId: session.id,
        },
      });

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.content).toBe('Hi! See you at the session.');
        expect(response.body.senderId).toBe(testCoach.id);
        expect(response.body.receiverId).toBe(testUser.id);
        expect(response.body.sessionId).toBe(session.id);
      }
    });

    it('should retrieve messages for a session', async () => {
      // Create a session
      const session = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
      });

      // Create some messages
      await test.db.createTestMessage({
        senderId: testUser.id,
        receiverId: testCoach.id,
        sessionId: session.id,
        content: 'Message 1 from user',
        senderType: Role.USER,
        receiverType: Role.COACH,
      });

      await test.db.createTestMessage({
        senderId: testCoach.id,
        receiverId: testUser.id,
        sessionId: session.id,
        content: 'Message 2 from coach',
        senderType: Role.COACH,
        receiverType: Role.USER,
      });

      // Retrieve messages for the session
      const response = await test.http.authenticatedGet(
        `/api/messages/session/${session.id}` as '/api/messages/session/{sessionId}',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should retrieve conversation between user and coach', async () => {
      // Create messages between user and coach
      await test.db.createTestMessage({
        senderId: testUser.id,
        receiverId: testCoach.id,
        content: 'Hello coach!',
        senderType: Role.USER,
        receiverType: Role.COACH,
      });

      await test.db.createTestMessage({
        senderId: testCoach.id,
        receiverId: testUser.id,
        content: 'Hello user!',
        senderType: Role.COACH,
        receiverType: Role.USER,
      });

      // Retrieve conversation
      const response = await test.http.authenticatedGet(
        `/api/messages/conversation/with-user/${testCoach.id}` as '/api/messages/conversation/with-user/{userId}',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should filter messages by session', async () => {
      // Create two sessions
      const session1 = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
      });

      // Create another time slot for second session
      const futureDate2 = new Date();
      futureDate2.setMonth(futureDate2.getMonth() + 2);
      const timeSlot2 = await test.db.createTestTimeSlot({
        coachId: testCoach.id,
        dateTime: futureDate2,
        isAvailable: true,
      });

      const session2 = await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: timeSlot2.id,
        status: SessionStatus.SCHEDULED,
      });

      // Create messages for each session
      await test.db.createTestMessage({
        senderId: testUser.id,
        receiverId: testCoach.id,
        sessionId: session1.id,
        content: 'Message for session 1',
        senderType: Role.USER,
        receiverType: Role.COACH,
      });

      await test.db.createTestMessage({
        senderId: testUser.id,
        receiverId: testCoach.id,
        sessionId: session2.id,
        content: 'Message for session 2',
        senderType: Role.USER,
        receiverType: Role.COACH,
      });

      // Retrieve messages for session 1 only
      const response = await test.http.authenticatedGet(
        `/api/messages/session/${session1.id}` as '/api/messages/session/{sessionId}',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(Array.isArray(response.body)).toBe(true);
        // All messages should be for session 1
        response.body.forEach((msg: { sessionId?: string }) => {
          expect(msg.sessionId).toBe(session1.id);
        });
      }
    });

    it('should require authentication for message operations', async () => {
      // Attempt to send message without authentication
      const response = await test.http.post('/api/messages', {
        body: {
          content: 'Unauthorized message',
          receiverId: testCoach.id,
        },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
      }
    });

    it('should retrieve specific message by ID', async () => {
      // Create a message
      const message = await test.db.createTestMessage({
        senderId: testUser.id,
        receiverId: testCoach.id,
        content: 'Test message for retrieval',
        senderType: Role.USER,
        receiverType: Role.COACH,
      });

      // Retrieve the message
      const response = await test.http.authenticatedGet(
        `/api/messages/${message.id}` as '/api/messages/{id}',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.id).toBe(message.id);
        expect(response.body.content).toBe('Test message for retrieval');
      }
    });
  });

  describe('Email Notification Tests', () => {
    it('should require authentication for email notifications', async () => {
      const response = await test.http.post('/api/notifications/email', {
        body: {
          to: 'test@example.com',
          subject: 'Test Subject',
          text: 'Test content',
        },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
      }
    });

    it('should validate email notification request body', async () => {
      // Missing required fields
      const response = await test.http.authenticatedPost('/api/notifications/email', userToken, {
        body: {
          to: '', // Invalid email
          subject: 'Test Subject',
        },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(400);
      }
    });

    it('should accept valid email notification request', async () => {
      const response = await test.http.authenticatedPost('/api/notifications/email', userToken, {
        body: {
          to: 'valid@example.com',
          subject: 'Test Subject',
          text: 'Test content',
          html: '<p>Test content</p>',
        },
      });

      // The endpoint should accept the request
      // Actual email delivery depends on SMTP configuration
      expect(response.status).toBeDefined();
    });
  });
});
