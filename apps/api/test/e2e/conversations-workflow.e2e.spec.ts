/**
 * E2E Tests: Conversations Workflow
 * Tests complete conversation workflows including creation, retrieval,
 * pinning/unpinning, and role-based access control
 */

import { Account, Role } from '@prisma/client';

import { E2ETest } from '../utils';

describe('Conversations Workflow (E2E)', () => {
  let test: E2ETest;
  let testUser: Account;
  let testCoach: Account;
  let testAdmin: Account;
  let userToken: string;
  let coachToken: string;
  let adminToken: string;

  /**
   * Seeds test data for conversation workflow tests
   */
  async function seedConversationTestData(): Promise<void> {
    const timestamp = Date.now();

    testUser = await test.db.createTestUser({
      email: `e2e-conv-user-${timestamp}@example.com`,
    });

    testCoach = await test.db.createTestCoach({
      email: `e2e-conv-coach-${timestamp}@example.com`,
    });

    testAdmin = await test.db.createTestUser({
      email: `e2e-conv-admin-${timestamp}@example.com`,
      role: Role.ADMIN,
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

    adminToken = await test.auth.createToken({
      sub: testAdmin.id,
      email: testAdmin.email,
      role: testAdmin.role,
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
    await seedConversationTestData();
  });

  describe('Conversation Retrieval', () => {
    it('should allow user to retrieve their conversations', async () => {
      // Create a conversation between user and coach
      await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
      });

      const response = await test.http.authenticatedGet('/api/conversations', userToken);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(1);
        expect(response.body[0]?.participantIds).toContain(testUser.id);
      }
    });

    it('should allow coach to retrieve their conversations', async () => {
      // Create conversations with multiple users
      const otherUser = await test.db.createTestUser();

      await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
      });

      await test.db.createTestConversation({
        participantIds: [otherUser.id, testCoach.id],
      });

      const response = await test.http.authenticatedGet('/api/conversations', coachToken);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);
        response.body.forEach((conv: { participantIds: string[] }) => {
          expect(conv.participantIds).toContain(testCoach.id);
        });
      }
    });

    it('should return conversation by ID for participant', async () => {
      const conversation = await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
      });

      const response = await test.http.authenticatedGet(
        `/api/conversations/${conversation.id}` as '/api/conversations/{id}',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(conversation.id);
        expect(response.body.participantIds).toContain(testUser.id);
        expect(response.body.participantIds).toContain(testCoach.id);
      }
    });

    it('should deny access to conversation for non-participant', async () => {
      const otherUser = await test.db.createTestUser();
      const conversation = await test.db.createTestConversation({
        participantIds: [otherUser.id, testCoach.id],
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
        participantIds: [testUser.id, testCoach.id],
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

  describe('Conversation Pinning Workflow', () => {
    it('should allow coach to pin a conversation', async () => {
      const conversation = await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
        isPinned: false,
      });

      const response = await test.http.authenticatedPost(
        `/api/conversations/${conversation.id}/pin` as '/api/conversations/{id}/pin',
        coachToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.isPinned).toBe(true);
        expect(response.body.pinnedBy).toBe(testCoach.id);
        expect(response.body.pinnedAt).toBeDefined();
      }
    });

    it('should allow coach to unpin a conversation', async () => {
      const conversation = await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
        isPinned: true,
        pinnedAt: new Date(),
        pinnedBy: testCoach.id,
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

    it('should prevent regular user from pinning conversation', async () => {
      const conversation = await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
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

    it('should prevent non-participant coach from pinning', async () => {
      const otherCoach = await test.db.createTestCoach();
      const otherCoachToken = await test.auth.createToken({
        sub: otherCoach.id,
        email: otherCoach.email,
        role: otherCoach.role,
      });

      const conversation = await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
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

    it('should allow admin to pin any conversation they participate in', async () => {
      const conversation = await test.db.createTestConversation({
        participantIds: [testAdmin.id, testCoach.id],
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
  });

  describe('Conversation Sorting', () => {
    it('should sort pinned conversations first', async () => {
      const now = new Date();

      // Create unpinned conversation with recent message
      await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
        isPinned: false,
        lastMessageAt: now,
      });

      // Create pinned conversation with older message
      await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
        isPinned: true,
        pinnedAt: new Date(now.getTime() - 60000),
        pinnedBy: testCoach.id,
        lastMessageAt: new Date(now.getTime() - 120000),
      });

      const response = await test.http.authenticatedGet('/api/conversations', coachToken);

      expect(response.ok).toBe(true);
      if (response.ok && response.body.length >= 2) {
        // Pinned conversation should appear first
        expect(response.body[0]?.isPinned).toBe(true);
      }
    });

    it('should sort conversations by last message timestamp', async () => {
      const now = new Date();

      // Create older conversation
      await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
        isPinned: false,
        lastMessageAt: new Date(now.getTime() - 60000),
      });

      // Create newer conversation
      await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
        isPinned: false,
        lastMessageAt: now,
      });

      const response = await test.http.authenticatedGet('/api/conversations', userToken);

      expect(response.ok).toBe(true);
      if (response.ok && response.body.length >= 2) {
        const unpinnedConvs = response.body.filter((c: { isPinned: boolean }) => !c.isPinned);

        if (unpinnedConvs.length >= 2) {
          const firstConv = unpinnedConvs[0] as { lastMessageAt: string };
          const secondConv = unpinnedConvs[1] as { lastMessageAt: string };
          const firstTimestamp = new Date(firstConv.lastMessageAt).getTime();
          const secondTimestamp = new Date(secondConv.lastMessageAt).getTime();
          expect(firstTimestamp).toBeGreaterThanOrEqual(secondTimestamp);
        }
      }
    });

    it('should sort pinned conversations by pin timestamp', async () => {
      const now = new Date();

      // Create first pinned conversation
      await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
        isPinned: true,
        pinnedAt: new Date(now.getTime() - 60000),
        pinnedBy: testCoach.id,
      });

      // Create second pinned conversation (more recently pinned)
      await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
        isPinned: true,
        pinnedAt: now,
        pinnedBy: testCoach.id,
      });

      const response = await test.http.authenticatedGet(
        '/api/conversations?isPinned=true' as '/api/conversations',
        coachToken
      );

      expect(response.ok).toBe(true);
      if (response.ok && response.body.length >= 2) {
        const firstConv = response.body[0] as { pinnedAt: string };
        const secondConv = response.body[1] as { pinnedAt: string };
        const firstPinnedAt = new Date(firstConv.pinnedAt).getTime();
        const secondPinnedAt = new Date(secondConv.pinnedAt).getTime();
        expect(firstPinnedAt).toBeGreaterThanOrEqual(secondPinnedAt);
      }
    });
  });

  describe('Conversation Filtering', () => {
    it('should filter conversations by pinned status', async () => {
      // Create pinned conversation
      await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
        isPinned: true,
        pinnedAt: new Date(),
        pinnedBy: testCoach.id,
      });

      // Create unpinned conversation
      await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
        isPinned: false,
      });

      // Get only pinned conversations
      const pinnedResponse = await test.http.authenticatedGet(
        '/api/conversations?isPinned=true' as '/api/conversations',
        coachToken
      );

      expect(pinnedResponse.ok).toBe(true);
      if (pinnedResponse.ok) {
        pinnedResponse.body.forEach((conv: { isPinned: boolean }) => {
          expect(conv.isPinned).toBe(true);
        });
      }

      // Get only unpinned conversations
      const unpinnedResponse = await test.http.authenticatedGet(
        '/api/conversations?isPinned=false' as '/api/conversations',
        coachToken
      );

      expect(unpinnedResponse.ok).toBe(true);
      if (unpinnedResponse.ok) {
        unpinnedResponse.body.forEach((conv: { isPinned: boolean }) => {
          expect(conv.isPinned).toBe(false);
        });
      }
    });
  });

  describe('Complete Conversation Workflow', () => {
    it('should complete full conversation workflow: create → retrieve → pin → unpin', async () => {
      // Step 1: Create a conversation
      const conversation = await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
        isPinned: false,
      });

      // Step 2: User retrieves their conversations
      const listResponse = await test.http.authenticatedGet('/api/conversations', userToken);
      expect(listResponse.ok).toBe(true);

      // Step 3: User retrieves specific conversation
      const getResponse = await test.http.authenticatedGet(
        `/api/conversations/${conversation.id}` as '/api/conversations/{id}',
        userToken
      );
      expect(getResponse.ok).toBe(true);
      if (getResponse.ok) {
        expect(getResponse.body.id).toBe(conversation.id);
        expect(getResponse.body.isPinned).toBe(false);
      }

      // Step 4: Coach pins the conversation
      const pinResponse = await test.http.authenticatedPost(
        `/api/conversations/${conversation.id}/pin` as '/api/conversations/{id}/pin',
        coachToken
      );
      expect(pinResponse.ok).toBe(true);
      if (pinResponse.ok) {
        expect(pinResponse.body.isPinned).toBe(true);
        expect(pinResponse.body.pinnedBy).toBe(testCoach.id);
      }

      // Step 5: Verify conversation is pinned
      const verifyPinResponse = await test.http.authenticatedGet(
        `/api/conversations/${conversation.id}` as '/api/conversations/{id}',
        coachToken
      );
      expect(verifyPinResponse.ok).toBe(true);
      if (verifyPinResponse.ok) {
        expect(verifyPinResponse.body.isPinned).toBe(true);
      }

      // Step 6: Coach unpins the conversation
      const unpinResponse = await test.http.authenticatedDelete(
        `/api/conversations/${conversation.id}/pin` as '/api/conversations/{id}/pin',
        coachToken
      );
      expect(unpinResponse.ok).toBe(true);
      if (unpinResponse.ok) {
        expect(unpinResponse.body.isPinned).toBe(false);
        expect(unpinResponse.body.pinnedAt).toBeNull();
      }

      // Step 7: Verify conversation is unpinned
      const verifyUnpinResponse = await test.http.authenticatedGet(
        `/api/conversations/${conversation.id}` as '/api/conversations/{id}',
        coachToken
      );
      expect(verifyUnpinResponse.ok).toBe(true);
      if (verifyUnpinResponse.ok) {
        expect(verifyUnpinResponse.body.isPinned).toBe(false);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const response = await test.http.get('/api/conversations');

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(401);
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

    it('should return 403 when pinning non-participant conversation', async () => {
      const otherUser = await test.db.createTestUser();
      const conversation = await test.db.createTestConversation({
        participantIds: [otherUser.id, testCoach.id],
        isPinned: false,
      });

      // Create another coach who is not a participant
      const anotherCoach = await test.db.createTestCoach();
      const anotherCoachToken = await test.auth.createToken({
        sub: anotherCoach.id,
        email: anotherCoach.email,
        role: anotherCoach.role,
      });

      const response = await test.http.authenticatedPost(
        `/api/conversations/${conversation.id}/pin` as '/api/conversations/{id}/pin',
        anotherCoachToken
      );

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(403);
      }
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
          participantIds: [account.id, testCoach.id],
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
});
