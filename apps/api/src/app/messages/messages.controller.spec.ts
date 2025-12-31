import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

interface MessagesControllerMocks {
  MessagesService: DeepMocked<MessagesService>;
}

describe('MessagesController', () => {
  let test: ControllerTest<MessagesController, MessagesControllerMocks, 'messages'>;

  beforeEach(async () => {
    test = new ControllerTest({
      controller: MessagesController,
      moduleName: 'messages',
      providers: [MessagesService],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // POST /api/messages - create message
  // ═══════════════════════════════════════════════════════════════════════

  describe('POST /api/messages', () => {
    it('should create a message as USER', async () => {
      const createDto = {
        content: 'Hello, I have a question',
        receiverId: 'receiver-123',
      };
      const mockMessage = test.factory.message.create({
        content: createDto.content,
        senderId: 'user-123',
        receiverId: createDto.receiverId,
        senderType: Role.USER,
        receiverType: Role.COACH,
      });
      test.mocks.MessagesService.create.mockResolvedValue(mockMessage);

      const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
      await test.http.authenticatedPost('/api/messages', userToken, {
        body: createDto,
      });

      expect(test.mocks.MessagesService.create).toHaveBeenCalledWith(
        createDto,
        'user-123',
        Role.USER
      );
    });

    it('should create a message with sessionId', async () => {
      const createDto = {
        content: 'Session related message',
        receiverId: 'coach-123',
        sessionId: 'session-123',
      };
      const mockMessage = test.factory.message.createWithNulls({
        content: createDto.content,
        sessionId: 'session-123',
      });
      test.mocks.MessagesService.create.mockResolvedValue(mockMessage);

      const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
      await test.http.authenticatedPost('/api/messages', userToken, {
        body: createDto,
      });

      expect(test.mocks.MessagesService.create).toHaveBeenCalledWith(
        createDto,
        'user-123',
        Role.USER
      );
    });

    it('should allow COACH to create messages', async () => {
      const createDto = {
        content: 'Coach message',
        receiverId: 'user-123',
      };
      const mockMessage = test.factory.message.createCoachToUser('coach-123', 'user-123', {
        content: createDto.content,
      });
      test.mocks.MessagesService.create.mockResolvedValue(mockMessage);

      const coachToken = await test.auth.createRoleToken(Role.COACH, { sub: 'coach-123' });
      await test.http.authenticatedPost('/api/messages', coachToken, {
        body: createDto,
      });

      expect(test.mocks.MessagesService.create).toHaveBeenCalledWith(
        createDto,
        'coach-123',
        Role.COACH
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // GET /api/messages - get all messages for user
  // ═══════════════════════════════════════════════════════════════════════

  describe('GET /api/messages', () => {
    it('should return all messages for the authenticated user', async () => {
      const mockMessages = [
        test.factory.message.createWithNulls({ senderId: 'user-123' }),
        test.factory.message.createWithNulls({ receiverId: 'user-123' }),
      ];
      test.mocks.MessagesService.findAll.mockResolvedValue(mockMessages);

      const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
      await test.http.authenticatedGet('/api/messages', userToken);

      expect(test.mocks.MessagesService.findAll).toHaveBeenCalledWith(
        'user-123',
        expect.any(Object)
      );
    });

    it('should pass sessionId query parameter to service', async () => {
      test.mocks.MessagesService.findAll.mockResolvedValue([]);

      const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
      await test.http.authenticatedGet(
        '/api/messages?sessionId=session-123' as '/api/messages',
        userToken
      );

      expect(test.mocks.MessagesService.findAll).toHaveBeenCalledWith('user-123', {
        sessionId: 'session-123',
      });
    });

    it('should pass conversationWith query parameter to service', async () => {
      test.mocks.MessagesService.findAll.mockResolvedValue([]);

      const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
      await test.http.authenticatedGet(
        '/api/messages?conversationWith=other-user' as '/api/messages',
        userToken
      );

      expect(test.mocks.MessagesService.findAll).toHaveBeenCalledWith('user-123', {
        conversationWith: 'other-user',
      });
    });

    it('should return empty array when no messages found', async () => {
      test.mocks.MessagesService.findAll.mockResolvedValue([]);

      const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
      await test.http.authenticatedGet('/api/messages', userToken);

      expect(test.mocks.MessagesService.findAll).toHaveBeenCalledWith(
        'user-123',
        expect.any(Object)
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // GET /api/messages/conversation/{userId} - get conversation with user
  // ═══════════════════════════════════════════════════════════════════════

  describe('GET /api/messages/conversation/{userId}', () => {
    it('should return conversation between two users', async () => {
      const mockMessages = test.factory.message.createConversation('user-123', 'other-user', 4);
      test.mocks.MessagesService.findConversation.mockResolvedValue(mockMessages);

      const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
      await test.http.authenticatedGet(
        '/api/messages/conversation/other-user' as '/api/messages/conversation/{userId}',
        userToken
      );

      expect(test.mocks.MessagesService.findConversation).toHaveBeenCalledWith(
        'user-123',
        'other-user'
      );
    });

    it('should return empty array when no conversation exists', async () => {
      test.mocks.MessagesService.findConversation.mockResolvedValue([]);

      const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
      await test.http.authenticatedGet(
        '/api/messages/conversation/other-user' as '/api/messages/conversation/{userId}',
        userToken
      );

      expect(test.mocks.MessagesService.findConversation).toHaveBeenCalledWith(
        'user-123',
        'other-user'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // GET /api/messages/session/{sessionId} - get session messages
  // ═══════════════════════════════════════════════════════════════════════

  describe('GET /api/messages/session/{sessionId}', () => {
    it('should return messages for session as USER', async () => {
      const mockMessages = [test.factory.message.createSessionMessage('session-123')];
      test.mocks.MessagesService.findBySession.mockResolvedValue(mockMessages);

      const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
      await test.http.authenticatedGet(
        '/api/messages/session/session-123' as '/api/messages/session/{sessionId}',
        userToken
      );

      expect(test.mocks.MessagesService.findBySession).toHaveBeenCalledWith(
        'session-123',
        'user-123',
        Role.USER,
        expect.any(Object)
      );
    });

    it('should allow COACH to view session messages', async () => {
      test.mocks.MessagesService.findBySession.mockResolvedValue([]);

      const coachToken = await test.auth.createRoleToken(Role.COACH, { sub: 'coach-123' });
      await test.http.authenticatedGet(
        '/api/messages/session/session-123' as '/api/messages/session/{sessionId}',
        coachToken
      );

      expect(test.mocks.MessagesService.findBySession).toHaveBeenCalledWith(
        'session-123',
        'coach-123',
        Role.COACH,
        expect.any(Object)
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // GET /api/messages/{id} - get single message
  // ═══════════════════════════════════════════════════════════════════════

  describe('GET /api/messages/{id}', () => {
    it('should return a single message by ID', async () => {
      const mockMessage = test.factory.message.createWithNulls({
        id: 'message-123',
        senderId: 'user-123',
      });
      test.mocks.MessagesService.findOne.mockResolvedValue(mockMessage);

      const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
      await test.http.authenticatedGet(
        '/api/messages/message-123' as '/api/messages/{id}',
        userToken
      );

      expect(test.mocks.MessagesService.findOne).toHaveBeenCalledWith('message-123', 'user-123');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Error Scenarios
  // ═══════════════════════════════════════════════════════════════════════

  describe('Error Scenarios', () => {
    describe('Not found errors', () => {
      it('should return 404 when message not found', async () => {
        test.mocks.MessagesService.findOne.mockRejectedValue(
          new NotFoundException('Message not found')
        );

        const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
        const response = await test.http.authenticatedGet(
          '/api/messages/non-existent' as '/api/messages/{id}',
          userToken
        );

        expect(response.status).toBe(404);
      });

      it('should return 404 when receiver not found during create', async () => {
        test.mocks.MessagesService.create.mockRejectedValue(
          new NotFoundException('Receiver not found')
        );

        const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
        const response = await test.http.authenticatedPost('/api/messages', userToken, {
          body: {
            content: 'Hello',
            receiverId: 'non-existent',
          },
        });

        expect(response.status).toBe(404);
      });

      it('should return 404 when session not found', async () => {
        test.mocks.MessagesService.findBySession.mockRejectedValue(
          new NotFoundException('Session not found')
        );

        const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
        const response = await test.http.authenticatedGet(
          '/api/messages/session/non-existent' as '/api/messages/session/{sessionId}',
          userToken
        );

        expect(response.status).toBe(404);
      });
    });

    describe('Forbidden errors', () => {
      it('should return 403 when user not authorized to view message', async () => {
        test.mocks.MessagesService.findOne.mockRejectedValue(
          new ForbiddenException('Not authorized to view this message')
        );

        const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
        const response = await test.http.authenticatedGet(
          '/api/messages/other-message' as '/api/messages/{id}',
          userToken
        );

        expect(response.status).toBe(403);
      });

      it('should return 403 when user not authorized for session messages', async () => {
        test.mocks.MessagesService.findBySession.mockRejectedValue(
          new ForbiddenException('Not authorized to view messages for this session')
        );

        const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
        const response = await test.http.authenticatedGet(
          '/api/messages/session/other-session' as '/api/messages/session/{sessionId}',
          userToken
        );

        expect(response.status).toBe(403);
      });

      it('should return 403 when user not authorized to send message for session', async () => {
        test.mocks.MessagesService.create.mockRejectedValue(
          new ForbiddenException('Not authorized to send messages for this session')
        );

        const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
        const response = await test.http.authenticatedPost('/api/messages', userToken, {
          body: {
            content: 'Hello',
            receiverId: 'receiver-123',
            sessionId: 'other-session',
          },
        });

        expect(response.status).toBe(403);
      });
    });
  });
});
