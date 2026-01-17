/**
 * Conversations Module Integration Tests
 * Tests conversation retrieval, pinning/unpinning, and access control workflows
 */

import { Role } from '@prisma/client';

import { AccountsModule } from '../../src/app/accounts/accounts.module';
import { BookingTypesModule } from '../../src/app/booking-types/booking-types.module';
import { ConversationsModule } from '../../src/app/conversations/conversations.module';
import { DiscountsModule } from '../../src/app/discounts/discounts.module';
import { IamModule } from '../../src/app/iam/iam.module';
import { MessagesModule } from '../../src/app/messages/messages.module';
import { NotificationsModule } from '../../src/app/notifications/notifications.module';
import { SessionsModule } from '../../src/app/sessions/sessions.module';
import { TimeSlotsModule } from '../../src/app/time-slots/time-slots.module';
import { IntegrationTest } from '../utils';

describe('Conversations Integration', () => {
  let test: IntegrationTest;
  let userToken: string;
  let coachToken: string;
  let adminToken: string;
  let userId: string;
  let coachId: string;
  let adminId: string;

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [
        ConversationsModule,
        IamModule,
        MessagesModule,
        AccountsModule,
        SessionsModule,
        BookingTypesModule,
        TimeSlotsModule,
        DiscountsModule,
        NotificationsModule,
      ],
    });
    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    await test.db.cleanupDatabase();

    const user = await test.db.createTestUser();
    const coach = await test.db.createTestCoach();
    const admin = await test.db.createTestUser({ role: Role.ADMIN });

    userId = user.id;
    coachId = coach.id;
    adminId = admin.id;

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

    adminToken = await test.auth.createToken({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });
  });

  describe('Conversation Retrieval', () => {
    describe('GET /api/conversations', () => {
      it('should return conversations for authenticated user', async () => {
        await test.db.createTestConversation({
          participantIds: [userId, coachId],
        });

        const response = await test.http.authenticatedGet('/api/conversations', userToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(1);
        }
      });

      it('should return conversations for coach', async () => {
        await test.db.createTestConversation({
          participantIds: [userId, coachId],
        });

        const response = await test.http.authenticatedGet('/api/conversations', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should only return conversations user participates in', async () => {
        const otherUser = await test.db.createTestUser();

        // Create conversation with other user
        await test.db.createTestConversation({
          participantIds: [otherUser.id, coachId],
        });

        // Create conversation with test user
        await test.db.createTestConversation({
          participantIds: [userId, coachId],
        });

        const response = await test.http.authenticatedGet('/api/conversations', userToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(Array.isArray(response.body)).toBe(true);
          // User should only see their own conversations
          response.body.forEach((conv: { participantIds: string[] }) => {
            expect(conv.participantIds).toContain(userId);
          });
        }
      });

      it('should filter conversations by isPinned', async () => {
        await test.db.createTestConversation({
          participantIds: [userId, coachId],
          isPinned: true,
          pinnedAt: new Date(),
          pinnedBy: coachId,
        });

        await test.db.createTestConversation({
          participantIds: [userId, coachId],
          isPinned: false,
        });

        const response = await test.http.authenticatedGet(
          '/api/conversations?isPinned=true' as '/api/conversations',
          coachToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          response.body.forEach((conv: { isPinned: boolean }) => {
            expect(conv.isPinned).toBe(true);
          });
        }
      });

      it('should sort pinned conversations first', async () => {
        // Create unpinned conversation (not referenced directly, used for sorting test)
        await test.db.createTestConversation({
          participantIds: [userId, coachId],
          isPinned: false,
          lastMessageAt: new Date(),
        });

        // Create pinned conversation (not referenced directly, used for sorting test)
        await test.db.createTestConversation({
          participantIds: [userId, coachId],
          isPinned: true,
          pinnedAt: new Date(),
          pinnedBy: coachId,
          lastMessageAt: new Date(Date.now() - 10000), // Older message
        });

        const response = await test.http.authenticatedGet('/api/conversations', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok && response.body.length >= 2) {
          // Pinned conversation should appear first
          const firstConv = response.body[0] as { isPinned: boolean } | undefined;
          expect(firstConv?.isPinned).toBe(true);
        }
      });

      it('should fail without authentication', async () => {
        const response = await test.http.get('/api/conversations');

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(401);
        }
      });
    });

    describe('GET /api/conversations/:id', () => {
      it('should return conversation by ID for participant', async () => {
        const conversation = await test.db.createTestConversation({
          participantIds: [userId, coachId],
        });

        const response = await test.http.authenticatedGet(
          `/api/conversations/${conversation.id}` as '/api/conversations/{id}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(conversation.id);
          expect(response.body.participantIds).toContain(userId);
          expect(response.body.participantIds).toContain(coachId);
        }
      });

      it('should deny access to non-participant', async () => {
        const otherUser = await test.db.createTestUser();
        const conversation = await test.db.createTestConversation({
          participantIds: [otherUser.id, coachId],
        });

        const response = await test.http.authenticatedGet(
          `/api/conversations/${conversation.id}` as '/api/conversations/{id}',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should allow admin to access any conversation', async () => {
        const conversation = await test.db.createTestConversation({
          participantIds: [userId, coachId],
        });

        const response = await test.http.authenticatedGet(
          `/api/conversations/${conversation.id}` as '/api/conversations/{id}',
          adminToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.id).toBe(conversation.id);
        }
      });

      it('should return 404 for non-existent conversation', async () => {
        const response = await test.http.authenticatedGet(
          '/api/conversations/cnonexistent12345678901' as '/api/conversations/{id}',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(404);
        }
      });
    });
  });

  describe('Conversation Pinning', () => {
    describe('POST /api/conversations/:id/pin', () => {
      it('should allow coach to pin conversation', async () => {
        const conversation = await test.db.createTestConversation({
          participantIds: [userId, coachId],
          isPinned: false,
        });

        const response = await test.http.authenticatedPost(
          `/api/conversations/${conversation.id}/pin` as '/api/conversations/{id}/pin',
          coachToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.isPinned).toBe(true);
          expect(response.body.pinnedBy).toBe(coachId);
          expect(response.body.pinnedAt).toBeDefined();
        }
      });

      it('should allow admin to pin conversation', async () => {
        const conversation = await test.db.createTestConversation({
          participantIds: [adminId, coachId],
          isPinned: false,
        });

        const response = await test.http.authenticatedPost(
          `/api/conversations/${conversation.id}/pin` as '/api/conversations/{id}/pin',
          adminToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.isPinned).toBe(true);
        }
      });

      it('should prevent regular user from pinning conversation', async () => {
        const conversation = await test.db.createTestConversation({
          participantIds: [userId, coachId],
          isPinned: false,
        });

        const response = await test.http.authenticatedPost(
          `/api/conversations/${conversation.id}/pin` as '/api/conversations/{id}/pin',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should prevent non-participant from pinning', async () => {
        const otherCoach = await test.db.createTestCoach();
        const otherCoachToken = await test.auth.createToken({
          sub: otherCoach.id,
          email: otherCoach.email,
          role: otherCoach.role,
        });

        const conversation = await test.db.createTestConversation({
          participantIds: [userId, coachId],
          isPinned: false,
        });

        const response = await test.http.authenticatedPost(
          `/api/conversations/${conversation.id}/pin` as '/api/conversations/{id}/pin',
          otherCoachToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });

    describe('DELETE /api/conversations/:id/pin', () => {
      it('should allow coach to unpin conversation', async () => {
        const conversation = await test.db.createTestConversation({
          participantIds: [userId, coachId],
          isPinned: true,
          pinnedAt: new Date(),
          pinnedBy: coachId,
        });

        const response = await test.http.authenticatedDelete(
          `/api/conversations/${conversation.id}/pin` as '/api/conversations/{id}/pin',
          coachToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.isPinned).toBe(false);
          expect(response.body.pinnedAt).toBeNull();
          expect(response.body.pinnedBy).toBeNull();
        }
      });

      it('should allow admin to unpin conversation', async () => {
        const conversation = await test.db.createTestConversation({
          participantIds: [adminId, coachId],
          isPinned: true,
          pinnedAt: new Date(),
          pinnedBy: coachId,
        });

        const response = await test.http.authenticatedDelete(
          `/api/conversations/${conversation.id}/pin` as '/api/conversations/{id}/pin',
          adminToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.isPinned).toBe(false);
        }
      });

      it('should prevent regular user from unpinning conversation', async () => {
        const conversation = await test.db.createTestConversation({
          participantIds: [userId, coachId],
          isPinned: true,
          pinnedAt: new Date(),
          pinnedBy: coachId,
        });

        const response = await test.http.authenticatedDelete(
          `/api/conversations/${conversation.id}/pin` as '/api/conversations/{id}/pin',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('Role-Based Access Control', () => {
    const roleTestCases = [
      { role: Role.ADMIN, canPin: true, description: 'ADMIN' },
      { role: Role.COACH, canPin: true, description: 'COACH' },
      { role: Role.USER, canPin: false, description: 'USER' },
    ] as const;

    it.each(roleTestCases)(
      'should $description role $canPin pin conversations',
      async ({ role, canPin }) => {
        const account = await test.db.createTestUser({ role });
        const token = await test.auth.createToken({
          sub: account.id,
          email: account.email,
          role,
        });

        const conversation = await test.db.createTestConversation({
          participantIds: [account.id, coachId],
          isPinned: false,
        });

        const response = await test.http.authenticatedPost(
          `/api/conversations/${conversation.id}/pin` as '/api/conversations/{id}/pin',
          token
        );

        if (canPin) {
          expect(response.ok).toBe(true);
          if (response.ok) {
            expect(response.body.isPinned).toBe(true);
          }
        } else {
          expect(response.ok).toBe(false);
          if (!response.ok) {
            expect(response.status).toBe(403);
          }
        }
      }
    );
  });

  describe('Conversation Sorting', () => {
    it('should sort conversations by last message timestamp', async () => {
      const now = new Date();

      await test.db.createTestConversation({
        participantIds: [userId, coachId],
        lastMessageAt: new Date(now.getTime() - 60000), // 1 minute ago
      });

      await test.db.createTestConversation({
        participantIds: [userId, coachId],
        lastMessageAt: now, // Now
      });

      const response = await test.http.authenticatedGet('/api/conversations', userToken);

      expect(response.ok).toBe(true);
      if (response.ok && response.body.length >= 2) {
        // Most recent should be first (after pinned)
        const timestamps = response.body
          .filter((c: { isPinned: boolean }) => !c.isPinned)
          .map((c: { lastMessageAt?: string }) => {
            if (c.lastMessageAt) {
              return new Date(c.lastMessageAt).getTime();
            }
            return 0;
          });

        for (let i = 0; i < timestamps.length - 1; i++) {
          const current = timestamps[i];
          const next = timestamps[i + 1];
          if (current !== undefined && next !== undefined) {
            expect(current).toBeGreaterThanOrEqual(next);
          }
        }
      }
    });

    it('should sort pinned conversations by pin timestamp', async () => {
      const now = new Date();

      await test.db.createTestConversation({
        participantIds: [userId, coachId],
        isPinned: true,
        pinnedAt: new Date(now.getTime() - 60000), // Pinned 1 minute ago
        pinnedBy: coachId,
      });

      await test.db.createTestConversation({
        participantIds: [userId, coachId],
        isPinned: true,
        pinnedAt: now, // Pinned now
        pinnedBy: coachId,
      });

      const response = await test.http.authenticatedGet(
        '/api/conversations?isPinned=true' as '/api/conversations',
        coachToken
      );

      expect(response.ok).toBe(true);
      if (response.ok && response.body.length >= 2) {
        // Most recently pinned should be first
        const pinnedTimestamps = response.body.map((c: { pinnedAt?: string }) => {
          if (c.pinnedAt) {
            return new Date(c.pinnedAt).getTime();
          }
          return 0;
        });

        for (let i = 0; i < pinnedTimestamps.length - 1; i++) {
          const current = pinnedTimestamps[i];
          const next = pinnedTimestamps[i + 1];
          if (current !== undefined && next !== undefined) {
            expect(current).toBeGreaterThanOrEqual(next);
          }
        }
      }
    });
  });
});
