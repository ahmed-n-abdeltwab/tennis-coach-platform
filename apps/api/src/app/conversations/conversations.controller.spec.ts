import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

interface ConversationsControllerMocks {
  ConversationsService: DeepMocked<ConversationsService>;
}

describe('ConversationsController', () => {
  let test: ControllerTest<ConversationsController, ConversationsControllerMocks, 'conversations'>;

  beforeEach(async () => {
    test = new ControllerTest({
      controller: ConversationsController,
      moduleName: 'conversations',
      providers: [ConversationsService],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('GET /api/conversations', () => {
    it('should return all conversations for the authenticated user', async () => {
      const mockConversations = [
        test.factory.conversation.create({
          participantIds: ['cuser12345678901234567', 'ccoach1234567890123456'],
        }),
        test.factory.conversation.create({
          participantIds: ['cuser12345678901234567', 'ccoach2345678901234567'],
        }),
      ];
      test.mocks.ConversationsService.findAll.mockResolvedValue(mockConversations);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedGet('/api/conversations', userToken);

      expect(test.mocks.ConversationsService.findAll).toHaveBeenCalledWith(
        expect.any(Object),
        'cuser12345678901234567',
        Role.USER
      );
    });

    it('should pass isPinned query parameter to service', async () => {
      test.mocks.ConversationsService.findAll.mockResolvedValue([]);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      const response = await test.http.authenticatedGet(
        '/api/conversations?isPinned=true' as '/api/conversations',
        coachToken
      );

      expect(response.ok).toBe(true);
      expect(test.mocks.ConversationsService.findAll).toHaveBeenCalledWith(
        { isPinned: true },
        'ccoach1234567890123456',
        Role.COACH
      );
    });
  });

  describe('GET /api/conversations/:id', () => {
    it('should return a single conversation by ID', async () => {
      const mockConversation = test.factory.conversation.create({
        id: 'cconversation123456789',
        participantIds: ['cuser12345678901234567', 'ccoach1234567890123456'],
      });
      test.mocks.ConversationsService.findOne.mockResolvedValue(mockConversation);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedGet(
        '/api/conversations/cconversation123456789' as '/api/conversations/{id}',
        userToken
      );

      expect(test.mocks.ConversationsService.findOne).toHaveBeenCalledWith(
        'cconversation123456789',
        'cuser12345678901234567',
        Role.USER
      );
    });
  });

  describe('POST /api/conversations/:id/pin', () => {
    it('should pin a conversation as COACH', async () => {
      const pinnedConversation = test.factory.conversation.createPinned('ccoach1234567890123456', {
        id: 'cconversation123456789',
        participantIds: ['cuser12345678901234567', 'ccoach1234567890123456'],
      });
      test.mocks.ConversationsService.pin.mockResolvedValue(pinnedConversation);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedPost(
        '/api/conversations/cconversation123456789/pin' as '/api/conversations/{id}/pin',
        coachToken,
        {}
      );

      expect(test.mocks.ConversationsService.pin).toHaveBeenCalledWith(
        'cconversation123456789',
        'ccoach1234567890123456',
        Role.COACH
      );
    });
  });

  describe('DELETE /api/conversations/:id/pin', () => {
    it('should unpin a conversation as COACH', async () => {
      const unpinnedConversation = test.factory.conversation.create({
        id: 'cconversation123456789',
        participantIds: ['cuser12345678901234567', 'ccoach1234567890123456'],
        isPinned: false,
      });
      test.mocks.ConversationsService.unpin.mockResolvedValue(unpinnedConversation);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedDelete(
        '/api/conversations/cconversation123456789/pin' as '/api/conversations/{id}/pin',
        coachToken
      );

      expect(test.mocks.ConversationsService.unpin).toHaveBeenCalledWith(
        'cconversation123456789',
        'ccoach1234567890123456',
        Role.COACH
      );
    });
  });

  describe('Error Scenarios', () => {
    describe('Not found errors', () => {
      it('should return 404 when conversation not found', async () => {
        test.mocks.ConversationsService.findOne.mockRejectedValue(
          new NotFoundException('Conversation not found')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedGet(
          '/api/conversations/cnonexistent12345678901' as '/api/conversations/{id}',
          userToken
        );

        expect(response.status).toBe(404);
      });

      it('should return 404 when pinning non-existent conversation', async () => {
        test.mocks.ConversationsService.pin.mockRejectedValue(
          new NotFoundException('Conversation not found')
        );

        const coachToken = await test.auth.createToken({
          role: Role.COACH,
          sub: 'ccoach1234567890123456',
        });
        const response = await test.http.authenticatedPost(
          '/api/conversations/cnonexistent12345678901/pin' as '/api/conversations/{id}/pin',
          coachToken,
          {}
        );

        expect(response.status).toBe(404);
      });
    });

    describe('Forbidden errors', () => {
      it('should return 403 when user not authorized to view conversation', async () => {
        test.mocks.ConversationsService.findOne.mockRejectedValue(
          new ForbiddenException('Access denied to this conversation')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedGet(
          '/api/conversations/cotherconversation1234' as '/api/conversations/{id}',
          userToken
        );

        expect(response.status).toBe(403);
      });

      it('should return 403 when USER tries to pin conversation', async () => {
        test.mocks.ConversationsService.pin.mockRejectedValue(
          new ForbiddenException('Only coaches can pin conversations')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedPost(
          '/api/conversations/cconversation123456789/pin' as '/api/conversations/{id}/pin',
          userToken,
          {}
        );

        expect(response.status).toBe(403);
      });

      it('should return 403 when USER tries to unpin conversation', async () => {
        test.mocks.ConversationsService.unpin.mockRejectedValue(
          new ForbiddenException('Only coaches can unpin conversations')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedDelete(
          '/api/conversations/cconversation123456789/pin' as '/api/conversations/{id}/pin',
          userToken
        );

        expect(response.status).toBe(403);
      });
    });
  });
});
