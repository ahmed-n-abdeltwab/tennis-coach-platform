/**
 * Integration tests for Messages module
 * Tests message sending workflows and database interactions
 */

import { Role } from '@prisma/client';

import { AccountsModule } from '../../src/app/accounts/accounts.module';
import { BookingTypesModule } from '../../src/app/booking-types/booking-types.module';
import { DiscountsModule } from '../../src/app/discounts/discounts.module';
import { IamModule } from '../../src/app/iam/iam.module';
import { MessagesModule } from '../../src/app/messages/messages.module';
import { SessionsModule } from '../../src/app/sessions/sessions.module';
import { TimeSlotsModule } from '../../src/app/time-slots/time-slots.module';
import { IntegrationTest } from '../utils';

/**
 * Messages Module Integration Tests
 * Tests message creation, retrieval, and session context workflows
 */
describe('Messages Integration', () => {
  let test: IntegrationTest;
  let userToken: string;
  let coachToken: string;
  let userId: string;
  let coachId: string;

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [
        MessagesModule,
        AccountsModule,
        SessionsModule,
        BookingTypesModule,
        TimeSlotsModule,
        DiscountsModule,
        IamModule,
      ],
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

  describe('Message Creation Workflows', () => {
    describe('POST /api/messages', () => {
      it('should allow user to send message to coach', async () => {
        const messageData = {
          content: 'Hello coach, I have a question about my session.',
          receiverId: coachId,
        };

        const response = await test.http.authenticatedPost('/api/messages', userToken, {
          body: messageData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('id');
          expect(response.body.content).toBe(messageData.content);
          expect(response.body.senderId).toBe(userId);
          expect(response.body.receiverId).toBe(coachId);
          expect(response.body.senderType).toBe(Role.USER);
          expect(response.body.receiverType).toBe(Role.COACH);
        }
      });

      it('should allow coach to send message to user', async () => {
        const messageData = {
          content: 'Hello, I received your question. Let me help you.',
          receiverId: userId,
        };

        const response = await test.http.authenticatedPost('/api/messages', coachToken, {
          body: messageData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('id');
          expect(response.body.content).toBe(messageData.content);
          expect(response.body.senderId).toBe(coachId);
          expect(response.body.receiverId).toBe(userId);
          expect(response.body.senderType).toBe(Role.COACH);
          expect(response.body.receiverType).toBe(Role.USER);
        }
      });

      it('should allow message with session context', async () => {
        // Create a session for context
        const session = await test.db.createTestSession({ userId, coachId });

        const messageData = {
          content: 'Question about our upcoming session.',
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

      it('should return 400 for invalid session ID', async () => {
        const messageData = {
          content: 'Message with invalid session.',
          receiverId: coachId,
          sessionId: 'non-existent-session-id',
        };

        const response = await test.http.authenticatedPost('/api/messages', userToken, {
          body: messageData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body.message).toBeDefined();
        }
      });

      it('should return 404 for non-existent receiver', async () => {
        const messageData = {
          content: 'Message to non-existent user.',
          receiverId: 'cnonexistent12345678901',
        };

        const response = await test.http.authenticatedPost('/api/messages', userToken, {
          body: messageData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(404);
          expect(response.body.message).toContain('not found');
        }
      });

      it('should fail without authentication', async () => {
        const messageData = {
          content: 'Unauthenticated message.',
          receiverId: coachId,
        };

        const response = await test.http.post('/api/messages', {
          body: messageData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(401);
        }
      });

      it('should fail with empty content', async () => {
        const messageData = {
          content: '',
          receiverId: coachId,
        };

        const response = await test.http.authenticatedPost('/api/messages', userToken, {
          body: messageData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });
    });
  });

  describe('Message Retrieval Workflows', () => {
    describe('GET /api/messages', () => {
      it('should retrieve all messages for current user', async () => {
        // Create messages between user and coach
        await test.db.createTestMessage({
          senderId: userId,
          receiverId: coachId,
          senderType: Role.USER,
          receiverType: Role.COACH,
        });
        await test.db.createTestMessage({
          senderId: coachId,
          receiverId: userId,
          senderType: Role.COACH,
          receiverType: Role.USER,
        });

        const response = await test.http.authenticatedGet('/api/messages', userToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(2);
          // All messages should involve the current user
          response.body.forEach((message: { senderId: string; receiverId: string }) => {
            expect([message.senderId, message.receiverId]).toContain(userId);
          });
        }
      });

      it('should filter messages by session ID', async () => {
        // Create a session
        const session = await test.db.createTestSession({ userId, coachId });

        // Create messages with and without session context
        await test.db.createTestMessage({
          senderId: userId,
          receiverId: coachId,
          sessionId: session.id,
          senderType: Role.USER,
          receiverType: Role.COACH,
        });
        await test.db.createTestMessage({
          senderId: userId,
          receiverId: coachId,
          sessionId: null,
          senderType: Role.USER,
          receiverType: Role.COACH,
        });

        const response = await test.http.authenticatedGet(
          `/api/messages?sessionId=${session.id}` as '/api/messages',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          // All returned messages should have the specified session ID
          response.body.forEach((message: { sessionId?: string }) => {
            expect(message.sessionId).toBe(session.id);
          });
        }
      });

      it('should filter messages by conversation partner', async () => {
        // Create another user
        const otherUser = await test.db.createTestUser();

        // Create messages with different users
        await test.db.createTestMessage({
          senderId: userId,
          receiverId: coachId,
          senderType: Role.USER,
          receiverType: Role.COACH,
        });
        await test.db.createTestMessage({
          senderId: userId,
          receiverId: otherUser.id,
          senderType: Role.USER,
          receiverType: Role.USER,
        });

        const response = await test.http.authenticatedGet(
          `/api/messages?conversationWith=${coachId}` as '/api/messages',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          // All returned messages should be between user and coach
          response.body.forEach((message: { senderId: string; receiverId: string }) => {
            const participants = [message.senderId, message.receiverId];
            expect(participants).toContain(userId);
            expect(participants).toContain(coachId);
          });
        }
      });
    });

    describe('GET /api/messages/:id', () => {
      it('should retrieve message by ID for sender', async () => {
        const message = await test.db.createTestMessage({
          senderId: userId,
          receiverId: coachId,
          senderType: Role.USER,
          receiverType: Role.COACH,
        });

        const response = await test.http.authenticatedGet(
          `/api/messages/${message.id}` as '/api/messages/{id}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(message.id);
          expect(response.body.senderId).toBe(userId);
        }
      });

      it('should retrieve message by ID for receiver', async () => {
        const message = await test.db.createTestMessage({
          senderId: userId,
          receiverId: coachId,
          senderType: Role.USER,
          receiverType: Role.COACH,
        });

        const response = await test.http.authenticatedGet(
          `/api/messages/${message.id}` as '/api/messages/{id}',
          coachToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(message.id);
          expect(response.body.receiverId).toBe(coachId);
        }
      });

      it('should prevent access to messages user is not part of', async () => {
        // Create another user
        const otherUser = await test.db.createTestUser();
        const otherUserToken = await test.auth.createToken({
          sub: otherUser.id,
          email: otherUser.email,
          role: otherUser.role,
        });

        // Create message between user and coach
        const message = await test.db.createTestMessage({
          senderId: userId,
          receiverId: coachId,
          senderType: Role.USER,
          receiverType: Role.COACH,
        });

        // Other user tries to access the message
        const response = await test.http.authenticatedGet(
          `/api/messages/${message.id}` as '/api/messages/{id}',
          otherUserToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should return 404 for non-existent message', async () => {
        const response = await test.http.authenticatedGet(
          '/api/messages/cnonexistentmsg12345678' as '/api/messages/{id}',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(404);
          expect(response.body.message).toContain('not found');
        }
      });
    });

    describe('GET /api/messages/conversation/:userId', () => {
      it('should retrieve conversation between two users', async () => {
        // Create messages in both directions
        await test.db.createTestMessage({
          senderId: userId,
          receiverId: coachId,
          content: 'Message from user to coach',
          senderType: Role.USER,
          receiverType: Role.COACH,
        });
        await test.db.createTestMessage({
          senderId: coachId,
          receiverId: userId,
          content: 'Reply from coach to user',
          senderType: Role.COACH,
          receiverType: Role.USER,
        });

        const response = await test.http.authenticatedGet(
          `/api/messages/conversation/${coachId}` as '/api/messages/conversation/{userId}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(2);
          // All messages should be between user and coach
          response.body.forEach((message: { senderId: string; receiverId: string }) => {
            const participants = [message.senderId, message.receiverId];
            expect(participants).toContain(userId);
            expect(participants).toContain(coachId);
          });
        }
      });

      it('should return empty array for conversation with no messages', async () => {
        const otherUser = await test.db.createTestUser();

        const response = await test.http.authenticatedGet(
          `/api/messages/conversation/${otherUser.id}` as '/api/messages/conversation/{userId}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBe(0);
        }
      });
    });

    describe('GET /api/messages/session/:sessionId', () => {
      it('should retrieve messages for a session as user', async () => {
        // Create a session
        const session = await test.db.createTestSession({ userId, coachId });

        // Create messages for the session
        await test.db.createTestMessage({
          senderId: userId,
          receiverId: coachId,
          sessionId: session.id,
          senderType: Role.USER,
          receiverType: Role.COACH,
        });
        await test.db.createTestMessage({
          senderId: coachId,
          receiverId: userId,
          sessionId: session.id,
          senderType: Role.COACH,
          receiverType: Role.USER,
        });

        const response = await test.http.authenticatedGet(
          `/api/messages/session/${session.id}` as '/api/messages/session/{sessionId}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(2);
          // All messages should belong to the session
          response.body.forEach((message: { sessionId?: string }) => {
            expect(message.sessionId).toBe(session.id);
          });
        }
      });

      it('should retrieve messages for a session as coach', async () => {
        // Create a session
        const session = await test.db.createTestSession({ userId, coachId });

        // Create messages for the session
        await test.db.createTestMessage({
          senderId: userId,
          receiverId: coachId,
          sessionId: session.id,
          senderType: Role.USER,
          receiverType: Role.COACH,
        });

        const response = await test.http.authenticatedGet(
          `/api/messages/session/${session.id}` as '/api/messages/session/{sessionId}',
          coachToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should prevent access to session messages for non-participants', async () => {
        // Create another user
        const otherUser = await test.db.createTestUser();
        const otherUserToken = await test.auth.createToken({
          sub: otherUser.id,
          email: otherUser.email,
          role: otherUser.role,
        });

        // Create a session between user and coach
        const session = await test.db.createTestSession({ userId, coachId });

        // Other user tries to access session messages
        const response = await test.http.authenticatedGet(
          `/api/messages/session/${session.id}` as '/api/messages/session/{sessionId}',
          otherUserToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(403);
        }
      });

      it('should return 404 for non-existent session', async () => {
        const response = await test.http.authenticatedGet(
          '/api/messages/session/cnonexistentsession123' as '/api/messages/session/{sessionId}',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(404);
          expect(response.body.message).toContain('not found');
        }
      });
    });
  });

  describe('Message Session Context', () => {
    const participantTestCases = [
      { role: 'sender', description: 'sender (user)' },
      { role: 'receiver', description: 'receiver (coach)' },
    ] as const;

    it.each(participantTestCases)(
      'should allow $description to retrieve session messages',
      async ({ role }) => {
        // Create a session
        const session = await test.db.createTestSession({ userId, coachId });

        // Create a message within the session
        const message = await test.db.createTestMessage({
          senderId: userId,
          receiverId: coachId,
          sessionId: session.id,
          content: 'Test message within session context',
          senderType: Role.USER,
          receiverType: Role.COACH,
        });

        // Use appropriate token based on role
        const token = role === 'sender' ? userToken : coachToken;

        // Retrieve the message by ID
        const messageResponse = await test.http.authenticatedGet(
          `/api/messages/${message.id}` as '/api/messages/{id}',
          token
        );

        expect(messageResponse.ok).toBe(true);
        if (messageResponse.ok) {
          expect(messageResponse.body.id).toBe(message.id);
          expect(messageResponse.body.sessionId).toBe(session.id);
        }

        // Retrieve messages by session
        const sessionMessagesResponse = await test.http.authenticatedGet(
          `/api/messages/session/${session.id}` as '/api/messages/session/{sessionId}',
          token
        );

        expect(sessionMessagesResponse.ok).toBe(true);
        if (sessionMessagesResponse.ok) {
          expect(Array.isArray(sessionMessagesResponse.body)).toBe(true);
          const foundMessage = sessionMessagesResponse.body.find(
            (m: { id: string }) => m.id === message.id
          );
          expect(foundMessage).toBeDefined();
          expect(foundMessage?.sessionId).toBe(session.id);
        }
      }
    );

    it('should maintain message-session relationship integrity', async () => {
      // Create a session
      const session = await test.db.createTestSession({ userId, coachId });

      // Create multiple messages within the session
      const message1 = await test.db.createTestMessage({
        senderId: userId,
        receiverId: coachId,
        sessionId: session.id,
        content: 'First message in session',
        senderType: Role.USER,
        receiverType: Role.COACH,
      });

      const message2 = await test.db.createTestMessage({
        senderId: coachId,
        receiverId: userId,
        sessionId: session.id,
        content: 'Reply in session',
        senderType: Role.COACH,
        receiverType: Role.USER,
      });

      // Retrieve all session messages
      const response = await test.http.authenticatedGet(
        `/api/messages/session/${session.id}` as '/api/messages/session/{sessionId}',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);

        // Verify both messages are present and linked to the session
        const messageIds = response.body.map((m: { id: string }) => m.id);
        expect(messageIds).toContain(message1.id);
        expect(messageIds).toContain(message2.id);

        // All messages should have the correct session ID
        response.body.forEach((message: { sessionId?: string }) => {
          expect(message.sessionId).toBe(session.id);
        });
      }
    });

    it('should not allow non-session participants to access session messages', async () => {
      // Create another user who is not part of the session
      const nonParticipant = await test.db.createTestUser();
      const nonParticipantToken = await test.auth.createToken({
        sub: nonParticipant.id,
        email: nonParticipant.email,
        role: nonParticipant.role,
      });

      // Create a session between user and coach
      const session = await test.db.createTestSession({ userId, coachId });

      // Create a message within the session
      await test.db.createTestMessage({
        senderId: userId,
        receiverId: coachId,
        sessionId: session.id,
        senderType: Role.USER,
        receiverType: Role.COACH,
      });

      // Non-participant tries to access session messages
      const response = await test.http.authenticatedGet(
        `/api/messages/session/${session.id}` as '/api/messages/session/{sessionId}',
        nonParticipantToken
      );

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(403);
      }
    });

    it('should allow messages without session context', async () => {
      // Create a message without session context
      const messageData = {
        content: 'General message without session',
        receiverId: coachId,
      };

      const response = await test.http.authenticatedPost('/api/messages', userToken, {
        body: messageData,
      });

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.sessionId).toBeNull();
        expect(response.body.senderId).toBe(userId);
        expect(response.body.receiverId).toBe(coachId);
      }
    });

    it('should prevent sending session message when not authorized for session', async () => {
      // Create another user
      const otherUser = await test.db.createTestUser();
      const otherUserToken = await test.auth.createToken({
        sub: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      // Create a session between user and coach (not involving otherUser)
      const session = await test.db.createTestSession({ userId, coachId });

      // Other user tries to send a message with this session context
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
  });
});
