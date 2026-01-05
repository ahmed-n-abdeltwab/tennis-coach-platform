/**
 * Integration tests for Notifications module
 * Tests notification delivery workflows and email service integration
 *
 * Note: The notifications module is an email-sending service, not a notification
 * storage system. Tests validate email sending endpoints with mocked transport.
 */

import { ConfigModule } from '@nestjs/config';

import { AccountsModule } from '../../src/app/accounts/accounts.module';
import { BookingTypesModule } from '../../src/app/booking-types/booking-types.module';
import { DiscountsModule } from '../../src/app/discounts/discounts.module';
import { IamModule } from '../../src/app/iam/iam.module';
import notificationsConfig from '../../src/app/notifications/config/notifications.config';
import { NotificationsModule } from '../../src/app/notifications/notifications.module';
import { SessionsModule } from '../../src/app/sessions/sessions.module';
import { TimeSlotsModule } from '../../src/app/time-slots/time-slots.module';
import { IntegrationTest } from '../utils';

// Mock nodemailer
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

/**
 * Notifications Module Integration Tests
 * Tests email notification sending and booking confirmation workflows
 */
describe('Notifications Integration', () => {
  let test: IntegrationTest;
  let userToken: string;
  let coachToken: string;
  let userId: string;
  let coachId: string;

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [
        ConfigModule.forRoot({
          load: [notificationsConfig],
          isGlobal: true,
        }),
        NotificationsModule,
        SessionsModule,
        BookingTypesModule,
        TimeSlotsModule,
        DiscountsModule,
        AccountsModule,
        IamModule,
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

  describe('Notification Creation (Email Sending)', () => {
    describe('POST /api/notifications/email', () => {
      it('should send email notification for authenticated user', async () => {
        const emailData = {
          to: 'recipient@example.com',
          subject: 'Test Notification',
          text: 'This is a test email notification.',
          html: '<p>This is a test email notification.</p>',
        };

        const response = await test.http.authenticatedPost('/api/notifications/email', userToken, {
          body: emailData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
        }
      });

      it('should send email notification for coach', async () => {
        const emailData = {
          to: 'student@example.com',
          subject: 'Session Reminder',
          text: 'Your session is tomorrow.',
        };

        const response = await test.http.authenticatedPost('/api/notifications/email', coachToken, {
          body: emailData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
        }
      });

      it('should send email with HTML content only', async () => {
        const emailData = {
          to: 'recipient@example.com',
          subject: 'HTML Only Email',
          html: '<h1>Welcome!</h1><p>This is an HTML email.</p>',
        };

        const response = await test.http.authenticatedPost('/api/notifications/email', userToken, {
          body: emailData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
        }
      });

      it('should send email with text content only', async () => {
        const emailData = {
          to: 'recipient@example.com',
          subject: 'Text Only Email',
          text: 'This is a plain text email.',
        };

        const response = await test.http.authenticatedPost('/api/notifications/email', userToken, {
          body: emailData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
        }
      });

      it('should return 401 for unauthenticated requests', async () => {
        const emailData = {
          to: 'recipient@example.com',
          subject: 'Test Email',
          text: 'Test content',
        };

        const response = await test.http.post('/api/notifications/email', {
          body: emailData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(401);
        }
      });

      it('should return 400 for invalid email address', async () => {
        const emailData = {
          to: 'invalid-email',
          subject: 'Test Email',
          text: 'Test content',
        };

        const response = await test.http.authenticatedPost('/api/notifications/email', userToken, {
          body: emailData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body.message).toBeDefined();
        }
      });

      it('should return 400 for missing required fields', async () => {
        const emailData = {
          to: 'recipient@example.com',
          // Missing subject
        };

        const response = await test.http.authenticatedPost('/api/notifications/email', userToken, {
          body: emailData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });

      it('should handle email sending failure gracefully', async () => {
        // Mock email sending failure
        mockSendMail.mockResolvedValueOnce({
          success: false,
          errors: ['SMTP connection failed'],
        });

        const emailData = {
          to: 'recipient@example.com',
          subject: 'Test Email',
          text: 'Test content',
        };

        const response = await test.http.authenticatedPost('/api/notifications/email', userToken, {
          body: emailData,
        });

        // The endpoint should still return 201 but with success: false
        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.success).toBe(false);
          expect(response.body.errors).toBeDefined();
        }
      });
    });
  });

  describe('Booking Confirmation Notifications', () => {
    describe('POST /api/notifications/confirm', () => {
      it('should send booking confirmation for valid session', async () => {
        // Create a session for the user
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

      it('should send booking confirmation for coach', async () => {
        // Create a session
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

      it('should return 401 for unauthenticated requests', async () => {
        const session = await test.db.createTestSession({ userId, coachId });

        const confirmData = {
          sessionId: session.id,
        };

        const response = await test.http.post('/api/notifications/confirm', {
          body: confirmData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(401);
        }
      });

      it('should return error for non-existent session', async () => {
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

      it('should return error for unauthorized session access', async () => {
        // Create another user
        const otherUser = await test.db.createTestUser();
        const otherUserToken = await test.auth.createToken({
          sub: otherUser.id,
          email: otherUser.email,
          role: otherUser.role,
        });

        // Create a session between original user and coach
        const session = await test.db.createTestSession({ userId, coachId });

        const confirmData = {
          sessionId: session.id,
        };

        // Other user tries to send confirmation for a session they're not part of
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

      it('should return 400 for missing sessionId', async () => {
        const confirmData = {};

        const response = await test.http.authenticatedPost(
          '/api/notifications/confirm',
          userToken,
          { body: confirmData }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });
    });
  });

  describe('Notification Delivery Verification', () => {
    it('should deliver notification to correct recipient', async () => {
      const recipientEmail = 'specific-recipient@example.com';
      const emailData = {
        to: recipientEmail,
        subject: 'Targeted Notification',
        text: 'This notification is for a specific user.',
      };

      const response = await test.http.authenticatedPost('/api/notifications/email', userToken, {
        body: emailData,
      });

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.success).toBe(true);
        // Verify the mock was called with correct recipient
        expect(mockSendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: recipientEmail,
          })
        );
      }
    });

    it('should include correct subject in notification', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Important: Session Update',
        text: 'Your session has been updated.',
      };

      const response = await test.http.authenticatedPost('/api/notifications/email', userToken, {
        body: emailData,
      });

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(mockSendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: 'Important: Session Update',
          })
        );
      }
    });
  });

  describe('Notification Delivery Status', () => {
    it('should return success status when email is sent', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Notification',
        text: 'Test content',
      };

      const response = await test.http.authenticatedPost('/api/notifications/email', userToken, {
        body: emailData,
      });

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.success).toBe(true);
        expect(response.body.message_ids).toBeDefined();
      }
    });

    it('should return failure status when email fails', async () => {
      mockSendMail.mockResolvedValueOnce({
        success: false,
        errors: ['Delivery failed'],
      });

      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Notification',
        text: 'Test content',
      };

      const response = await test.http.authenticatedPost('/api/notifications/email', userToken, {
        body: emailData,
      });

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
      }
    });
  });

  describe('Notification Ownership', () => {
    const userRoles = [
      { role: 'user', description: 'regular user' },
      { role: 'coach', description: 'coach' },
    ] as const;

    it.each(userRoles)(
      'should allow $description to send email notifications',
      async ({ role }) => {
        const token = role === 'user' ? userToken : coachToken;
        const emailData = {
          to: 'recipient@example.com',
          subject: `Notification from ${role}`,
          text: `This is a notification sent by a ${role}.`,
        };

        const response = await test.http.authenticatedPost('/api/notifications/email', token, {
          body: emailData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.success).toBe(true);
        }
      }
    );

    it('should only allow session participants to send booking confirmations', async () => {
      // Create a session between user and coach
      const session = await test.db.createTestSession({ userId, coachId });

      // Create a non-participant user
      const nonParticipant = await test.db.createTestUser();
      const nonParticipantToken = await test.auth.createToken({
        sub: nonParticipant.id,
        email: nonParticipant.email,
        role: nonParticipant.role,
      });

      // Session participant (user) should be able to send confirmation
      const participantResponse = await test.http.authenticatedPost(
        '/api/notifications/confirm',
        userToken,
        { body: { sessionId: session.id } }
      );
      expect(participantResponse.ok).toBe(true);

      // Non-participant should not be able to send confirmation
      const nonParticipantResponse = await test.http.authenticatedPost(
        '/api/notifications/confirm',
        nonParticipantToken,
        { body: { sessionId: session.id } }
      );
      expect(nonParticipantResponse.ok).toBe(false);
      if (!nonParticipantResponse.ok) {
        expect(nonParticipantResponse.status).toBeGreaterThanOrEqual(401);
      }
    });

    it('should allow coach to send booking confirmation for their sessions', async () => {
      // Create a session
      const session = await test.db.createTestSession({ userId, coachId });

      const response = await test.http.authenticatedPost('/api/notifications/confirm', coachToken, {
        body: { sessionId: session.id },
      });

      expect(response.ok).toBe(true);
    });

    it('should prevent unauthenticated users from sending any notifications', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Unauthorized Notification',
        text: 'This should fail.',
      };

      const response = await test.http.post('/api/notifications/email', {
        body: emailData,
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
      }
    });

    it('should maintain notification integrity with correct sender context', async () => {
      // Create multiple users
      const user1 = await test.db.createTestUser();
      const user2 = await test.db.createTestUser();

      const user1Token = await test.auth.createToken({
        sub: user1.id,
        email: user1.email,
        role: user1.role,
      });

      const user2Token = await test.auth.createToken({
        sub: user2.id,
        email: user2.email,
        role: user2.role,
      });

      // Both users can send their own notifications
      const response1 = await test.http.authenticatedPost('/api/notifications/email', user1Token, {
        body: {
          to: 'recipient1@example.com',
          subject: 'From User 1',
          text: 'Notification from user 1',
        },
      });

      const response2 = await test.http.authenticatedPost('/api/notifications/email', user2Token, {
        body: {
          to: 'recipient2@example.com',
          subject: 'From User 2',
          text: 'Notification from user 2',
        },
      });

      expect(response1.ok).toBe(true);
      expect(response2.ok).toBe(true);

      // Verify both notifications were sent independently
      expect(mockSendMail).toHaveBeenCalledTimes(2);
    });
  });
});
