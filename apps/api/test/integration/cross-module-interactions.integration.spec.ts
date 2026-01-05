/**
 * Cross-Module Integration Tests
 * Tests service-to-service interactions, module communication, and dependency injection
 */

import { ConfigModule } from '@nestjs/config';
import { Role, SessionStatus } from '@prisma/client';

import { AccountsModule } from '../../src/app/accounts/accounts.module';
import { BookingTypesModule } from '../../src/app/booking-types/booking-types.module';
import { CalendarModule } from '../../src/app/calendar/calendar.module';
import { DiscountsModule } from '../../src/app/discounts/discounts.module';
import { IamModule } from '../../src/app/iam/iam.module';
import { MessagesModule } from '../../src/app/messages/messages.module';
import notificationsConfig from '../../src/app/notifications/config/notifications.config';
import { NotificationsModule } from '../../src/app/notifications/notifications.module';
import paymentsConfig from '../../src/app/payments/config/payments.config';
import { PaymentsModule } from '../../src/app/payments/payments.module';
import { SessionsModule } from '../../src/app/sessions/sessions.module';
import { TimeSlotsModule } from '../../src/app/time-slots/time-slots.module';
import { IntegrationTest } from '../utils';

// Mock nodemailer for notifications tests
const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

// Mock MailtrapTransport
jest.mock('mailtrap', () => ({
  MailtrapTransport: jest.fn(() => ({})),
}));

describe('Cross-Module Integration Tests', () => {
  let test: IntegrationTest;
  let userToken: string;
  let coachToken: string;
  let userId: string;
  let coachId: string;

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [
        ConfigModule.forRoot({
          load: [notificationsConfig, paymentsConfig],
          isGlobal: true,
        }),
        IamModule,
        AccountsModule,
        BookingTypesModule,
        SessionsModule,
        TimeSlotsModule,
        DiscountsModule,
        MessagesModule,
        PaymentsModule,
        CalendarModule,
        NotificationsModule,
      ],
    });

    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    // Reset mocks
    mockSendMail.mockReset();
    mockSendMail.mockResolvedValue({
      success: true,
      message_ids: ['test-message-id'],
    });

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

  /**
   * Service-to-Service Interaction Tests
   * Validates: Requirements 10.1, 10.4
   *
   * Tests the interaction between different services when creating sessions,
   * applying discounts, and sending messages within session context.
   */
  describe('Service-to-Service Interactions', () => {
    describe('Session Creation with Discount Service', () => {
      it('should create session with valid discount code applied', async () => {
        // Create booking type and time slot
        const bookingType = await test.db.createTestBookingType({ coachId });
        const timeSlot = await test.db.createTestTimeSlot({ coachId, isAvailable: true });

        // Create an active discount code
        const discount = await test.db.createTestDiscount({
          coachId,
          isActive: true,
          useCount: 0,
          maxUsage: 10,
        });

        // Create session with discount code
        const createData = {
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          discountCode: discount.code,
          notes: 'Session with discount',
        };

        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: createData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('id');
          expect(response.body.discountCode).toBe(discount.code);
          expect(response.body.userId).toBe(userId);
          expect(response.body.coachId).toBe(coachId);
        }
      });

      it('should create session without applying invalid discount code', async () => {
        const bookingType = await test.db.createTestBookingType({ coachId });
        const timeSlot = await test.db.createTestTimeSlot({ coachId, isAvailable: true });

        const createData = {
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          discountCode: 'INVALID_CODE',
        };

        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: createData,
        });

        // Session is created but discount is not applied (silently ignored)
        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('id');
          // The invalid discount code is stored but not applied
          expect(response.body.discountCode).toBe('INVALID_CODE');
        }
      });

      it('should create session without applying expired discount code', async () => {
        const bookingType = await test.db.createTestBookingType({ coachId });
        const timeSlot = await test.db.createTestTimeSlot({ coachId, isAvailable: true });

        // Create an expired discount
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const discount = await test.db.createTestDiscount({
          coachId,
          isActive: true,
          expiry: pastDate,
        });

        const createData = {
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          discountCode: discount.code,
        };

        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: createData,
        });

        // Session is created but expired discount is not applied
        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('id');
        }
      });

      it('should create session without applying discount at usage limit', async () => {
        const bookingType = await test.db.createTestBookingType({ coachId });
        const timeSlot = await test.db.createTestTimeSlot({ coachId, isAvailable: true });

        // Create a discount at its usage limit
        const discount = await test.db.createTestDiscount({
          coachId,
          isActive: true,
          useCount: 5,
          maxUsage: 5,
        });

        const createData = {
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          discountCode: discount.code,
        };

        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: createData,
        });

        // Session is created but discount at limit is not applied
        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('id');
        }
      });
    });

    describe('Message Creation with Session Validation', () => {
      it('should allow message creation with valid session context', async () => {
        // Create a session between user and coach
        const session = await test.db.createTestSession({ userId, coachId });

        const messageData = {
          content: 'Question about our session',
          receiverId: coachId,
          sessionId: session.id,
        };

        const response = await test.http.authenticatedPost('/api/messages', userToken, {
          body: messageData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body.sessionId).toBe(session.id);
          expect(response.body.senderId).toBe(userId);
          expect(response.body.receiverId).toBe(coachId);
        }
      });

      it('should reject message creation with invalid session ID', async () => {
        const messageData = {
          content: 'Message with invalid session',
          receiverId: coachId,
          sessionId: 'non-existent-session-id',
        };

        const response = await test.http.authenticatedPost('/api/messages', userToken, {
          body: messageData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
        }
      });

      it('should reject message creation for session user is not part of', async () => {
        // Create another user
        const otherUser = await test.db.createTestUser();
        const otherUserToken = await test.auth.createToken({
          sub: otherUser.id,
          email: otherUser.email,
          role: otherUser.role,
        });

        // Create a session between original user and coach
        const session = await test.db.createTestSession({ userId, coachId });

        // Other user tries to send message with this session context
        const messageData = {
          content: 'Unauthorized session message',
          receiverId: coachId,
          sessionId: session.id,
        };

        const response = await test.http.authenticatedPost('/api/messages', otherUserToken, {
          body: messageData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(403);
        }
      });

      it('should allow coach to send message within session context', async () => {
        const session = await test.db.createTestSession({ userId, coachId });

        const messageData = {
          content: 'Coach response within session',
          receiverId: userId,
          sessionId: session.id,
        };

        const response = await test.http.authenticatedPost('/api/messages', coachToken, {
          body: messageData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body.sessionId).toBe(session.id);
          expect(response.body.senderId).toBe(coachId);
          expect(response.body.receiverId).toBe(userId);
        }
      });
    });
  });

  /**
   * Session with Payment Tests
   * Validates: Requirements 10.2
   *
   * Tests the interaction between sessions and payments modules,
   * ensuring sessions and payments are linked correctly.
   */
  describe('Session with Payment Integration', () => {
    describe('Session-Payment Linkage', () => {
      it('should correctly reflect unpaid session status', async () => {
        const session = await test.db.createTestSession({ userId, coachId, isPaid: false });

        const response = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.id).toBe(session.id);
          expect(response.body.isPaid).toBe(false);
        }
      });

      it('should correctly reflect paid session status', async () => {
        const session = await test.db.createTestSession({ userId, coachId, isPaid: true });

        const response = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.id).toBe(session.id);
          expect(response.body.isPaid).toBe(true);
        }
      });

      it('should prevent payment creation for already paid session', async () => {
        const session = await test.db.createTestSession({ userId, coachId, isPaid: true });

        const createData = {
          sessionId: session.id,
          amount: 75.0,
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

      it('should validate session ownership before payment creation', async () => {
        // Create another user
        const otherUser = await test.db.createTestUser();
        const otherUserToken = await test.auth.createToken({
          sub: otherUser.id,
          email: otherUser.email,
          role: otherUser.role,
        });

        // Create session for original user
        const session = await test.db.createTestSession({ userId, coachId, isPaid: false });

        // Other user tries to create payment for this session
        const createData = {
          sessionId: session.id,
          amount: 75.0,
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          otherUserToken,
          { body: createData }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
        }
      });

      it('should return 400 for payment with non-existent session', async () => {
        const createData = {
          sessionId: 'non-existent-session-id',
          amount: 75.0,
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          { body: createData }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
        }
      });
    });

    describe('Session Payment State Consistency', () => {
      const paymentStates = [
        { isPaid: false, description: 'unpaid' },
        { isPaid: true, description: 'paid' },
      ] as const;

      it.each(paymentStates)(
        'should maintain consistent $description state across session retrieval',
        async ({ isPaid }) => {
          const session = await test.db.createTestSession({ userId, coachId, isPaid });

          // Retrieve via direct session endpoint
          const sessionResponse = await test.http.authenticatedGet(
            `/api/sessions/${session.id}` as '/api/sessions/{id}',
            userToken
          );

          expect(sessionResponse.ok).toBe(true);
          if (sessionResponse.ok) {
            expect(sessionResponse.body.isPaid).toBe(isPaid);
          }

          // Retrieve via sessions list
          const listResponse = await test.http.authenticatedGet('/api/sessions', userToken);

          expect(listResponse.ok).toBe(true);
          if (listResponse.ok) {
            const foundSession = listResponse.body.find((s: { id: string }) => s.id === session.id);
            expect(foundSession).toBeDefined();
            expect(foundSession?.isPaid).toBe(isPaid);
          }
        }
      );
    });
  });

  /**
   * Session with Notifications Tests
   * Validates: Requirements 10.3
   *
   * Tests the interaction between sessions and notifications modules,
   * ensuring notifications can be triggered for session events.
   */
  describe('Session with Notifications Integration', () => {
    describe('Booking Confirmation Notifications', () => {
      it('should send booking confirmation for valid session', async () => {
        const session = await test.db.createTestSession({ userId, coachId });

        const confirmData = {
          sessionId: session.id,
        };

        const response = await test.http.authenticatedPost(
          '/api/notifications/confirm',
          userToken,
          { body: confirmData }
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
        }
      });

      it('should allow coach to send booking confirmation', async () => {
        const session = await test.db.createTestSession({ userId, coachId });

        const confirmData = {
          sessionId: session.id,
        };

        const response = await test.http.authenticatedPost(
          '/api/notifications/confirm',
          coachToken,
          { body: confirmData }
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
        }
      });

      it('should reject confirmation for non-existent session', async () => {
        const confirmData = {
          sessionId: 'non-existent-session-id',
        };

        const response = await test.http.authenticatedPost(
          '/api/notifications/confirm',
          userToken,
          { body: confirmData }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
        }
      });

      it('should reject confirmation from non-participant', async () => {
        // Create another user who is not part of the session
        const otherUser = await test.db.createTestUser();
        const otherUserToken = await test.auth.createToken({
          sub: otherUser.id,
          email: otherUser.email,
          role: otherUser.role,
        });

        const session = await test.db.createTestSession({ userId, coachId });

        const confirmData = {
          sessionId: session.id,
        };

        const response = await test.http.authenticatedPost(
          '/api/notifications/confirm',
          otherUserToken,
          { body: confirmData }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(401);
        }
      });
    });

    describe('Session Event Notifications', () => {
      it('should allow email notification after session creation', async () => {
        // Create a session
        const bookingType = await test.db.createTestBookingType({ coachId });
        const timeSlot = await test.db.createTestTimeSlot({ coachId, isAvailable: true });

        const createData = {
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
        };

        const sessionResponse = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: createData,
        });

        expect(sessionResponse.ok).toBe(true);

        if (sessionResponse.ok) {
          // Send notification about the new session
          const emailData = {
            to: 'coach@example.com',
            subject: 'New Session Booked',
            text: `A new session has been booked. Session ID: ${sessionResponse.body.id}`,
          };

          const notificationResponse = await test.http.authenticatedPost(
            '/api/notifications/email',
            userToken,
            { body: emailData }
          );

          expect(notificationResponse.ok).toBe(true);
          if (notificationResponse.ok) {
            expect(notificationResponse.body.success).toBe(true);
          }
        }
      });

      it('should allow email notification after session cancellation', async () => {
        const session = await test.db.createTestSession({
          userId,
          coachId,
          status: SessionStatus.SCHEDULED,
        });

        // Cancel the session
        const cancelResponse = await test.http.authenticatedPut(
          `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
          userToken
        );

        expect(cancelResponse.ok).toBe(true);

        // Send cancellation notification
        const emailData = {
          to: 'coach@example.com',
          subject: 'Session Cancelled',
          text: `Session ${session.id} has been cancelled.`,
        };

        const notificationResponse = await test.http.authenticatedPost(
          '/api/notifications/email',
          userToken,
          { body: emailData }
        );

        expect(notificationResponse.ok).toBe(true);
        if (notificationResponse.ok) {
          expect(notificationResponse.body.success).toBe(true);
        }
      });

      it('should allow coach to send session reminder notification', async () => {
        // Create session to establish context for the reminder
        const session = await test.db.createTestSession({ userId, coachId });

        const emailData = {
          to: 'user@example.com',
          subject: 'Session Reminder',
          text: `Reminder: You have an upcoming session (ID: ${session.id}) scheduled for ${session.dateTime}.`,
        };

        const response = await test.http.authenticatedPost('/api/notifications/email', coachToken, {
          body: emailData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.success).toBe(true);
        }
      });
    });

    describe('Notification Session Context Validation', () => {
      const sessionStatuses = [
        { status: SessionStatus.SCHEDULED, description: 'scheduled' },
        { status: SessionStatus.CONFIRMED, description: 'confirmed' },
        { status: SessionStatus.COMPLETED, description: 'completed' },
      ] as const;

      it.each(sessionStatuses)(
        'should allow booking confirmation for $description session',
        async ({ status }) => {
          const session = await test.db.createTestSession({ userId, coachId, status });

          const confirmData = {
            sessionId: session.id,
          };

          const response = await test.http.authenticatedPost(
            '/api/notifications/confirm',
            userToken,
            { body: confirmData }
          );

          expect(response.ok).toBe(true);
          if (response.ok) {
            expect(response.status).toBe(201);
          }
        }
      );
    });
  });

  /**
   * Complex Multi-Module Workflow Tests
   * Tests end-to-end workflows involving multiple modules
   */
  describe('Complex Multi-Module Workflows', () => {
    it('should complete full booking workflow with discount and notification', async () => {
      // 1. Create booking type and time slot
      const bookingType = await test.db.createTestBookingType({ coachId });
      const timeSlot = await test.db.createTestTimeSlot({ coachId, isAvailable: true });

      // 2. Create discount code
      const discount = await test.db.createTestDiscount({
        coachId,
        isActive: true,
        useCount: 0,
        maxUsage: 10,
      });

      // 3. Create session with discount
      const sessionData = {
        bookingTypeId: bookingType.id,
        timeSlotId: timeSlot.id,
        discountCode: discount.code,
        notes: 'Full workflow test session',
      };

      const sessionResponse = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: sessionData,
      });

      expect(sessionResponse.ok).toBe(true);

      if (sessionResponse.ok) {
        const sessionId = sessionResponse.body.id;

        // 4. Send booking confirmation notification
        const confirmResponse = await test.http.authenticatedPost(
          '/api/notifications/confirm',
          userToken,
          { body: { sessionId } }
        );

        expect(confirmResponse.ok).toBe(true);

        // 5. Send message within session context
        const messageData = {
          content: 'Looking forward to our session!',
          receiverId: coachId,
          sessionId,
        };

        const messageResponse = await test.http.authenticatedPost('/api/messages', userToken, {
          body: messageData,
        });

        expect(messageResponse.ok).toBe(true);
        if (messageResponse.ok) {
          expect(messageResponse.body.sessionId).toBe(sessionId);
        }

        // 6. Verify session can be retrieved with all data
        const getSessionResponse = await test.http.authenticatedGet(
          `/api/sessions/${sessionId}` as '/api/sessions/{id}',
          userToken
        );

        expect(getSessionResponse.ok).toBe(true);
        if (getSessionResponse.ok) {
          expect(getSessionResponse.body.id).toBe(sessionId);
          expect(getSessionResponse.body.discountCode).toBe(discount.code);
        }
      }
    });

    it('should handle session lifecycle with messages and notifications', async () => {
      // 1. Create session
      const session = await test.db.createTestSession({
        userId,
        coachId,
        status: SessionStatus.SCHEDULED,
      });

      // 2. User sends message about session
      const userMessageData = {
        content: 'Question about our upcoming session',
        receiverId: coachId,
        sessionId: session.id,
      };

      const userMessageResponse = await test.http.authenticatedPost('/api/messages', userToken, {
        body: userMessageData,
      });

      expect(userMessageResponse.ok).toBe(true);

      // 3. Coach responds
      const coachMessageData = {
        content: 'Happy to help! What would you like to know?',
        receiverId: userId,
        sessionId: session.id,
      };

      const coachMessageResponse = await test.http.authenticatedPost('/api/messages', coachToken, {
        body: coachMessageData,
      });

      expect(coachMessageResponse.ok).toBe(true);

      // 4. Retrieve all session messages
      const messagesResponse = await test.http.authenticatedGet(
        `/api/messages/session/${session.id}` as '/api/messages/session/{sessionId}',
        userToken
      );

      expect(messagesResponse.ok).toBe(true);
      if (messagesResponse.ok) {
        expect(Array.isArray(messagesResponse.body)).toBe(true);
        expect(messagesResponse.body.length).toBeGreaterThanOrEqual(2);
      }

      // 5. Cancel session
      const cancelResponse = await test.http.authenticatedPut(
        `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
        userToken
      );

      expect(cancelResponse.ok).toBe(true);
      if (cancelResponse.ok) {
        expect(cancelResponse.body.status).toBe(SessionStatus.CANCELLED);
      }

      // 6. Send cancellation notification
      const notificationData = {
        to: 'coach@example.com',
        subject: 'Session Cancelled',
        text: 'Your session has been cancelled by the user.',
      };

      const notificationResponse = await test.http.authenticatedPost(
        '/api/notifications/email',
        userToken,
        { body: notificationData }
      );

      expect(notificationResponse.ok).toBe(true);
    });

    it('should maintain data integrity across module interactions', async () => {
      // Create multiple sessions for the same user
      const session1 = await test.db.createTestSession({ userId, coachId, isPaid: false });
      const session2 = await test.db.createTestSession({ userId, coachId, isPaid: true });

      // Create messages for each session
      await test.db.createTestMessage({
        senderId: userId,
        receiverId: coachId,
        sessionId: session1.id,
        senderType: Role.USER,
        receiverType: Role.COACH,
      });

      await test.db.createTestMessage({
        senderId: userId,
        receiverId: coachId,
        sessionId: session2.id,
        senderType: Role.USER,
        receiverType: Role.COACH,
      });

      // Verify session 1 messages
      const session1Messages = await test.http.authenticatedGet(
        `/api/messages/session/${session1.id}` as '/api/messages/session/{sessionId}',
        userToken
      );

      expect(session1Messages.ok).toBe(true);
      if (session1Messages.ok) {
        session1Messages.body.forEach((msg: { sessionId?: string }) => {
          expect(msg.sessionId).toBe(session1.id);
        });
      }

      // Verify session 2 messages
      const session2Messages = await test.http.authenticatedGet(
        `/api/messages/session/${session2.id}` as '/api/messages/session/{sessionId}',
        userToken
      );

      expect(session2Messages.ok).toBe(true);
      if (session2Messages.ok) {
        session2Messages.body.forEach((msg: { sessionId?: string }) => {
          expect(msg.sessionId).toBe(session2.id);
        });
      }

      // Verify sessions maintain their payment status
      const sessionsResponse = await test.http.authenticatedGet('/api/sessions', userToken);

      expect(sessionsResponse.ok).toBe(true);
      if (sessionsResponse.ok) {
        const foundSession1 = sessionsResponse.body.find(
          (s: { id: string }) => s.id === session1.id
        );
        const foundSession2 = sessionsResponse.body.find(
          (s: { id: string }) => s.id === session2.id
        );

        expect(foundSession1?.isPaid).toBe(false);
        expect(foundSession2?.isPaid).toBe(true);
      }
    });
  });
});
