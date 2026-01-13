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

  describe('POST /api/messages', () => {
    it('should create a message as USER', async () => {
      const createDto = {
        content: 'Hello, I have a question',
        receiverId: 'creceiver1234567890123',
      };
      const mockMessage = test.factory.message.create({
        content: createDto.content,
        senderId: 'cuser12345678901234567',
        receiverId: createDto.receiverId,
        senderType: Role.USER,
        receiverType: Role.COACH,
      });
      test.mocks.MessagesService.create.mockResolvedValue(mockMessage);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedPost('/api/messages', userToken, {
        body: createDto,
      });

      expect(test.mocks.MessagesService.create).toHaveBeenCalledWith(
        createDto,
        'cuser12345678901234567',
        Role.USER
      );
    });

    it('should create a message with sessionId', async () => {
      const createDto = {
        content: 'Session related message',
        receiverId: 'ccoach1234567890123456',
        sessionId: 'csession123456789012345',
      };
      const mockMessage = test.factory.message.createWithNulls({
        content: createDto.content,
        sessionId: 'csession123456789012345',
      });
      test.mocks.MessagesService.create.mockResolvedValue(mockMessage);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedPost('/api/messages', userToken, {
        body: createDto,
      });

      expect(test.mocks.MessagesService.create).toHaveBeenCalledWith(
        createDto,
        'cuser12345678901234567',
        Role.USER
      );
    });

    it('should allow COACH to create messages', async () => {
      const createDto = {
        content: 'Coach message',
        receiverId: 'cuser12345678901234567',
      };
      const mockMessage = test.factory.message.createCoachToUser(
        'ccoach1234567890123456',
        'cuser12345678901234567',
        {
          content: createDto.content,
        }
      );
      test.mocks.MessagesService.create.mockResolvedValue(mockMessage);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedPost('/api/messages', coachToken, {
        body: createDto,
      });

      expect(test.mocks.MessagesService.create).toHaveBeenCalledWith(
        createDto,
        'ccoach1234567890123456',
        Role.COACH
      );
    });
  });

  describe('GET /api/messages', () => {
    it('should return all messages for the authenticated user', async () => {
      const mockMessages = [
        test.factory.message.createWithNulls({ senderId: 'cuser12345678901234567' }),
        test.factory.message.createWithNulls({ receiverId: 'cuser12345678901234567' }),
      ];
      test.mocks.MessagesService.findAll.mockResolvedValue(mockMessages);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedGet('/api/messages', userToken);

      expect(test.mocks.MessagesService.findAll).toHaveBeenCalledWith(
        'cuser12345678901234567',
        expect.any(Object)
      );
    });

    it('should pass sessionId query parameter to service', async () => {
      test.mocks.MessagesService.findAll.mockResolvedValue([]);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedGet(
        '/api/messages?sessionId=csession123456789012345' as '/api/messages',
        userToken
      );

      expect(test.mocks.MessagesService.findAll).toHaveBeenCalledWith('cuser12345678901234567', {
        sessionId: 'csession123456789012345',
      });
    });

    it('should pass conversationWith query parameter to service', async () => {
      test.mocks.MessagesService.findAll.mockResolvedValue([]);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedGet(
        '/api/messages?conversationWith=cotheruser12345678901' as '/api/messages',
        userToken
      );

      expect(test.mocks.MessagesService.findAll).toHaveBeenCalledWith('cuser12345678901234567', {
        conversationWith: 'cotheruser12345678901',
      });
    });

    it('should return empty array when no messages found', async () => {
      test.mocks.MessagesService.findAll.mockResolvedValue([]);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedGet('/api/messages', userToken);

      expect(test.mocks.MessagesService.findAll).toHaveBeenCalledWith(
        'cuser12345678901234567',
        expect.any(Object)
      );
    });
  });

  describe('GET /api/messages/conversation/{userId}', () => {
    it('should return conversation between two users', async () => {
      const mockMessages = test.factory.message.createConversation(
        'cuser12345678901234567',
        'cotheruser12345678901',
        4
      );
      test.mocks.MessagesService.findConversation.mockResolvedValue(mockMessages);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedGet(
        '/api/messages/conversation/cotheruser12345678901' as '/api/messages/conversation/{userId}',
        userToken
      );

      expect(test.mocks.MessagesService.findConversation).toHaveBeenCalledWith(
        'cuser12345678901234567',
        'cotheruser12345678901'
      );
    });

    it('should return empty array when no conversation exists', async () => {
      test.mocks.MessagesService.findConversation.mockResolvedValue([]);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedGet(
        '/api/messages/conversation/cotheruser12345678901' as '/api/messages/conversation/{userId}',
        userToken
      );

      expect(test.mocks.MessagesService.findConversation).toHaveBeenCalledWith(
        'cuser12345678901234567',
        'cotheruser12345678901'
      );
    });
  });

  describe('GET /api/messages/session/{sessionId}', () => {
    it('should return messages for session as USER', async () => {
      const mockMessages = [test.factory.message.createSessionMessage('csession123456789012345')];
      test.mocks.MessagesService.findBySession.mockResolvedValue(mockMessages);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedGet(
        '/api/messages/session/csession123456789012345' as '/api/messages/session/{sessionId}',
        userToken
      );

      expect(test.mocks.MessagesService.findBySession).toHaveBeenCalledWith(
        'csession123456789012345',
        'cuser12345678901234567',
        Role.USER,
        expect.any(Object)
      );
    });

    it('should allow COACH to view session messages', async () => {
      test.mocks.MessagesService.findBySession.mockResolvedValue([]);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedGet(
        '/api/messages/session/csession123456789012345' as '/api/messages/session/{sessionId}',
        coachToken
      );

      expect(test.mocks.MessagesService.findBySession).toHaveBeenCalledWith(
        'csession123456789012345',
        'ccoach1234567890123456',
        Role.COACH,
        expect.any(Object)
      );
    });
  });

  describe('GET /api/messages/{id}', () => {
    it('should return a single message by ID', async () => {
      const mockMessage = test.factory.message.createWithNulls({
        id: 'cmessage12345678901234',
        senderId: 'cuser12345678901234567',
      });
      test.mocks.MessagesService.findOne.mockResolvedValue(mockMessage);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedGet(
        '/api/messages/cmessage12345678901234' as '/api/messages/{id}',
        userToken
      );

      expect(test.mocks.MessagesService.findOne).toHaveBeenCalledWith(
        'cmessage12345678901234',
        'cuser12345678901234567'
      );
    });
  });

  describe('Error Scenarios', () => {
    describe('Not found errors', () => {
      it('should return 404 when message not found', async () => {
        test.mocks.MessagesService.findOne.mockRejectedValue(
          new NotFoundException('Message not found')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedGet(
          '/api/messages/cnonexistent12345678901' as '/api/messages/{id}',
          userToken
        );

        expect(response.status).toBe(404);
      });

      it('should return 404 when receiver not found during create', async () => {
        test.mocks.MessagesService.create.mockRejectedValue(
          new NotFoundException('Receiver not found')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedPost('/api/messages', userToken, {
          body: {
            content: 'Hello',
            receiverId: 'cnonexistent12345678901',
          },
        });

        expect(response.status).toBe(404);
      });

      it('should return 404 when session not found', async () => {
        test.mocks.MessagesService.findBySession.mockRejectedValue(
          new NotFoundException('Session not found')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedGet(
          '/api/messages/session/cnonexistent12345678901' as '/api/messages/session/{sessionId}',
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

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedGet(
          '/api/messages/cothermessage123456789' as '/api/messages/{id}',
          userToken
        );

        expect(response.status).toBe(403);
      });

      it('should return 403 when user not authorized for session messages', async () => {
        test.mocks.MessagesService.findBySession.mockRejectedValue(
          new ForbiddenException('Not authorized to view messages for this session')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedGet(
          '/api/messages/session/cothersession123456789' as '/api/messages/session/{sessionId}',
          userToken
        );

        expect(response.status).toBe(403);
      });

      it('should return 403 when user not authorized to send message for session', async () => {
        test.mocks.MessagesService.create.mockRejectedValue(
          new ForbiddenException('Not authorized to send messages for this session')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedPost('/api/messages', userToken, {
          body: {
            content: 'Hello',
            receiverId: 'creceiver1234567890123',
            sessionId: 'cothersession123456789',
          },
        });

        expect(response.status).toBe(403);
      });
    });
  });
});
