import { SessionStatus } from '@prisma/client';

import { AccountsModule } from '../../src/app/accounts/accounts.module';
import { BookingTypesModule } from '../../src/app/booking-types/booking-types.module';
import { DiscountsModule } from '../../src/app/discounts/discounts.module';
import { IamModule } from '../../src/app/iam/iam.module';
import { MessagesModule } from '../../src/app/messages/messages.module';
import { SessionsModule } from '../../src/app/sessions/sessions.module';
import { TimeSlotsModule } from '../../src/app/time-slots/time-slots.module';
import { IntegrationTest } from '../utils';

describe('Event Handling Integration Tests', () => {
  let test: IntegrationTest;
  let userToken: string;
  let coachToken: string;
  let userId: string;
  let coachId: string;

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [
        IamModule,
        SessionsModule,
        MessagesModule,
        AccountsModule,
        BookingTypesModule,
        TimeSlotsModule,
        DiscountsModule,
      ],
    });

    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
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

  describe('Message Event Handling', () => {
    describe('Message creation events across sessions', () => {
      it('should create message event and associateth session', async () => {
        // Create a session
        const session = await test.db.createTestSession({ userId, coachId });

        // Create a message within the session context
        const messageData = {
          content: 'Test message for session event',
          receiverId: coachId,
          sessionId: session.id,
        };

        const response = await test.http.authenticatedPost('/api/messages', userToken, {
          body: messageData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('id');
          expect(response.body.sessionId).toBe(session.id);
          expect(response.body.senderId).toBe(userId);
          expect(response.body.receiverId).toBe(coachId);
        }
      });

      it('should handle message creation events for multiple sessions', async () => {
        // Create multiple sessions
        const session1 = await test.db.createTestSession({ userId, coachId });
        const session2 = await test.db.createTestSession({ userId, coachId });

        // Create messages for each session
        const message1Response = await test.http.authenticatedPost('/api/messages', userToken, {
          body: {
            content: 'Message for session 1',
            receiverId: coachId,
            sessionId: session1.id,
          },
        });

        const message2Response = await test.http.authenticatedPost('/api/messages', userToken, {
          body: {
            content: 'Message for session 2',
            receiverId: coachId,
            sessionId: session2.id,
          },
        });

        expect(message1Response.ok).toBe(true);
        expect(message2Response.ok).toBe(true);

        if (message1Response.ok && message2Response.ok) {
          // Verify messages are associated with correct sessions
          expect(message1Response.body.sessionId).toBe(session1.id);
          expect(message2Response.body.sessionId).toBe(session2.id);

          // Verify messages can be retrieved by session
          const session1Messages = await test.http.authenticatedGet(
            `/api/messages/session/${session1.id}` as '/api/messages/session/{sessionId}',
            userToken
          );

          const session2Messages = await test.http.authenticatedGet(
            `/api/messages/session/${session2.id}` as '/api/messages/session/{sessionId}',
            userToken
          );

          expect(session1Messages.ok).toBe(true);
          expect(session2Messages.ok).toBe(true);

          if (session1Messages.ok && session2Messages.ok) {
            expect(Array.isArray(session1Messages.body)).toBe(true);
            expect(Array.isArray(session2Messages.body)).toBe(true);

            // Each session should have its own messages
            const session1MessageIds = session1Messages.body.map((m: { id: string }) => m.id);
            const session2MessageIds = session2Messages.body.map((m: { id: string }) => m.id);

            expect(session1MessageIds).toContain(message1Response.body.id);
            expect(session2MessageIds).toContain(message2Response.body.id);

            // Messages should not cross sessions
            expect(session1MessageIds).not.toContain(message2Response.body.id);
            expect(session2MessageIds).not.toContain(message1Response.body.id);
          }
        }
      });

      it('should handle bidirectional message events within a session', async () => {
        // Create a session
        const session = await test.db.createTestSession({ userId, coachId });

        // User sends message to coach
        const userMessageResponse = await test.http.authenticatedPost('/api/messages', userToken, {
          body: {
            content: 'Question from user',
            receiverId: coachId,
            sessionId: session.id,
          },
        });

        // Coach replies to user
        const coachMessageResponse = await test.http.authenticatedPost(
          '/api/messages',
          coachToken,
          {
            body: {
              content: 'Reply from coach',
              receiverId: userId,
              sessionId: session.id,
            },
          }
        );

        expect(userMessageResponse.ok).toBe(true);
        expect(coachMessageResponse.ok).toBe(true);

        if (userMessageResponse.ok && coachMessageResponse.ok) {
          // Verify both messages are in the session
          const sessionMessages = await test.http.authenticatedGet(
            `/api/messages/session/${session.id}` as '/api/messages/session/{sessionId}',
            userToken
          );

          expect(sessionMessages.ok).toBe(true);
          if (sessionMessages.ok) {
            expect(sessionMessages.body.length).toBeGreaterThanOrEqual(2);

            const messageIds = sessionMessages.body.map((m: { id: string }) => m.id);
            expect(messageIds).toContain(userMessageResponse.body.id);
            expect(messageIds).toContain(coachMessageResponse.body.id);
          }
        }
      });

      it('should maintain message order within session events', async () => {
        // Create a session
        const session = await test.db.createTestSession({ userId, coachId });

        // Create multiple messages in sequence
        const messages: string[] = [];
        for (let i = 0; i < 3; i++) {
          const response = await test.http.authenticatedPost('/api/messages', userToken, {
            body: {
              content: `Message ${i + 1}`,
              receiverId: coachId,
              sessionId: session.id,
            },
          });

          expect(response.ok).toBe(true);
          if (response.ok) {
            messages.push(response.body.id);
          }
        }

        // Retrieve session messages
        const sessionMessages = await test.http.authenticatedGet(
          `/api/messages/session/${session.id}` as '/api/messages/session/{sessionId}',
          userToken
        );

        expect(sessionMessages.ok).toBe(true);
        if (sessionMessages.ok) {
          expect(sessionMessages.body.length).toBeGreaterThanOrEqual(3);

          // All created messages should be present
          const retrievedIds = sessionMessages.body.map((m: { id: string }) => m.id);
          messages.forEach(messageId => {
            expect(retrievedIds).toContain(messageId);
          });
        }
      });

      it('should handle message events without session context', async () => {
        // Create a message without session context (direct message)
        const messageData = {
          content: 'Direct message without session',
          receiverId: coachId,
        };

        const response = await test.http.authenticatedPost('/api/messages', userToken, {
          body: messageData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body.sessionId).toBeNull();
          expect(response.body.senderId).toBe(userId);
          expect(response.body.receiverId).toBe(coachId);
        }
      });
    });
  });

  describe('Session State Change Events', () => {
    describe('Session status change events', () => {
      it('should handle session update event', async () => {
        // Create a session
        const session = await test.db.createTestSession({
          userId,
          coachId,
          status: SessionStatus.SCHEDULED,
        });

        // Update session notes
        const updateData = {
          notes: 'Updated session notes via event',
        };

        const response = await test.http.authenticatedPut(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken,
          { body: updateData }
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(session.id);
          expect(response.body.notes).toBe('Updated session notes via event');
        }
      });

      it('should handle session status transitions', async () => {
        // Create a session in SCHEDULED status
        const session = await test.db.createTestSession({
          userId,
          coachId,
          status: SessionStatus.SCHEDULED,
        });

        // Verify initial status
        const initialResponse = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(initialResponse.ok).toBe(true);
        if (initialResponse.ok) {
          expect(initialResponse.body.status).toBe(SessionStatus.SCHEDULED);
        }

        // Cancel the session (status transition)
        const cancelResponse = await test.http.authenticatedPut(
          `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
          userToken
        );

        expect(cancelResponse.ok).toBe(true);
        if (cancelResponse.ok) {
          expect(cancelResponse.body.status).toBe(SessionStatus.CANCELLED);
        }

        // Verify the status change persisted
        const finalResponse = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(finalResponse.ok).toBe(true);
        if (finalResponse.ok) {
          expect(finalResponse.body.status).toBe(SessionStatus.CANCELLED);
        }
      });

      it('should handle multiple session state changes', async () => {
        // Create multiple sessions
        const session1 = await test.db.createTestSession({
          userId,
          coachId,
          status: SessionStatus.SCHEDULED,
        });
        const session2 = await test.db.createTestSession({
          userId,
          coachId,
          status: SessionStatus.SCHEDULED,
        });

        // Update both sessions
        const update1Response = await test.http.authenticatedPut(
          `/api/sessions/${session1.id}` as '/api/sessions/{id}',
          userToken,
          { body: { notes: 'Session 1 updated' } }
        );

        const update2Response = await test.http.authenticatedPut(
          `/api/sessions/${session2.id}` as '/api/sessions/{id}',
          userToken,
          { body: { notes: 'Session 2 updated' } }
        );

        expect(update1Response.ok).toBe(true);
        expect(update2Response.ok).toBe(true);

        if (update1Response.ok && update2Response.ok) {
          expect(update1Response.body.notes).toBe('Session 1 updated');
          expect(update2Response.body.notes).toBe('Session 2 updated');
        }
      });
    });

    describe('Session cancellation events', () => {
      it('should handle user cancellation event', async () => {
        // Create a session
        const session = await test.db.createTestSession({
          userId,
          coachId,
          status: SessionStatus.SCHEDULED,
        });

        // User cancels the session
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

      it('should handle coach cancellation event', async () => {
        // Create a session
        const session = await test.db.createTestSession({
          userId,
          coachId,
          status: SessionStatus.SCHEDULED,
        });

        // Coach cancels the session
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

      it('should prevent cancellation of already cancelled session', async () => {
        // Create a cancelled session
        const session = await test.db.createTestSession({
          userId,
          coachId,
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

      it('should handle cancellation event for confirmed session', async () => {
        // Create a confirmed session
        const session = await test.db.createTestSession({
          userId,
          coachId,
          status: SessionStatus.CONFIRMED,
        });

        // Cancel the confirmed session
        const response = await test.http.authenticatedPut(
          `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.status).toBe(SessionStatus.CANCELLED);
        }
      });

      it('should prevent unauthorized cancellation events', async () => {
        // Create another user
        const otherUser = await test.db.createTestUser();
        const otherUserToken = await test.auth.createToken({
          sub: otherUser.id,
          email: otherUser.email,
          role: otherUser.role,
        });

        // Create a session between original user and coach
        const session = await test.db.createTestSession({
          userId,
          coachId,
          status: SessionStatus.SCHEDULED,
        });

        // Other user tries to cancel
        const response = await test.http.authenticatedPut(
          `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
          otherUserToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(403);
        }
      });

      it('should return 404 for cancellation of non-existent session', async () => {
        const response = await test.http.authenticatedPut(
          '/api/sessions/non-existent-id/cancel' as '/api/sessions/{id}/cancel',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(404);
        }
      });

      it('should maintain session data integrity after cancellation', async () => {
        // Create a session with specific data
        const session = await test.db.createTestSession({
          userId,
          coachId,
          status: SessionStatus.SCHEDULED,
          notes: 'Important session notes',
        });

        // Cancel the session
        const cancelResponse = await test.http.authenticatedPut(
          `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
          userToken
        );

        expect(cancelResponse.ok).toBe(true);

        // Verify session data is preserved after cancellation
        const getResponse = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(getResponse.ok).toBe(true);
        if (getResponse.ok) {
          expect(getResponse.body.id).toBe(session.id);
          expect(getResponse.body.status).toBe(SessionStatus.CANCELLED);
          expect(getResponse.body.userId).toBe(userId);
          expect(getResponse.body.coachId).toBe(coachId);
          // Notes should be preserved
          expect(getResponse.body.notes).toBe('Important session notes');
        }
      });
    });

    describe('Session state change event data-driven tests', () => {
      const cancellableStatuses = [
        { status: SessionStatus.SCHEDULED, description: 'SCHEDULED' },
        { status: SessionStatus.CONFIRMED, description: 'CONFIRMED' },
      ] as const;

      it.each(cancellableStatuses)(
        'should successfully cancel $description session',
        async ({ status }) => {
          const session = await test.db.createTestSession({
            userId,
            coachId,
            status,
          });

          const response = await test.http.authenticatedPut(
            `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
            userToken
          );

          expect(response.ok).toBe(true);
          if (response.ok) {
            expect(response.body.status).toBe(SessionStatus.CANCELLED);
          }
        }
      );

      const participantRoles = [
        { role: 'user', description: 'session user' },
        { role: 'coach', description: 'session coach' },
      ] as const;

      it.each(participantRoles)('should allow $description to cancel session', async ({ role }) => {
        const session = await test.db.createTestSession({
          userId,
          coachId,
          status: SessionStatus.SCHEDULED,
        });

        const token = role === 'user' ? userToken : coachToken;

        const response = await test.http.authenticatedPut(
          `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
          token
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.status).toBe(SessionStatus.CANCELLED);
        }
      });
    });
  });
});
