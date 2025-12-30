import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';

import { CreateMessageDto, MessageResponseDto } from './dto/message.dto';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

describe.skip('MessagesController', () => {
  let test: ControllerTest<MessagesController, MessagesService, 'messages'>;
  let mockService: jest.Mocked<MessagesService>;

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findConversation: jest.fn(),
      findBySession: jest.fn(),
    } as any;

    test = new ControllerTest({
      controllerClass: MessagesController,
      moduleName: 'messages',
      providers: [{ provide: MessagesService, useValue: mockService }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('POST /messages', () => {
    it('should call create service method with correct parameters', async () => {
      const createDto: CreateMessageDto = {
        content: 'Hello, I have a question',
        receiverId: 'receiver-123',
      };

      const mockMessage: MessageResponseDto = {
        id: 'message-123',
        content: createDto.content,
        senderId: 'user-123',
        receiverId: createDto.receiverId,
        sessionId: undefined,
        senderType: Role.USER,
        receiverType: Role.COACH,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.create.mockResolvedValue(mockMessage);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedPost('/api/messages', userToken, {
        body: createDto,
      });

      expect(mockService.create).toHaveBeenCalledWith(createDto, 'user-123', Role.USER);
    });

    it('should call create service method with sessionId', async () => {
      const createDto: CreateMessageDto = {
        content: 'Session related message',
        receiverId: 'coach-123',
        sessionId: 'session-123',
      };

      const mockMessage: MessageResponseDto = {
        id: 'message-123',
        content: createDto.content,
        senderId: 'user-123',
        receiverId: createDto.receiverId,
        sessionId: createDto.sessionId,
        senderType: Role.USER,
        receiverType: Role.COACH,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.create.mockResolvedValue(mockMessage);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedPost('/api/messages', userToken, {
        body: createDto,
      });

      expect(mockService.create).toHaveBeenCalledWith(createDto, 'user-123', Role.USER);
    });

    it('should allow coach to create messages', async () => {
      const createDto: CreateMessageDto = {
        content: 'Coach message',
        receiverId: 'user-123',
      };

      const mockMessage: MessageResponseDto = {
        id: 'message-123',
        content: createDto.content,
        senderId: 'coach-123',
        receiverId: createDto.receiverId,
        sessionId: undefined,
        senderType: Role.COACH,
        receiverType: Role.USER,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.create.mockResolvedValue(mockMessage);

      const coachToken = await test.auth.createRoleToken(Role.COACH, {
        sub: 'coach-123',
      });
      await test.http.authenticatedPost('/api/messages', coachToken, {
        body: createDto,
      });

      expect(mockService.create).toHaveBeenCalledWith(createDto, 'coach-123', Role.COACH);
    });
  });

  describe('GET /messages', () => {
    it('should call findAll service method with correct parameters', async () => {
      const mockMessages: MessageResponseDto[] = [
        {
          id: 'message-1',
          content: 'Message 1',
          senderId: 'user-123',
          receiverId: 'receiver-1',
          sessionId: undefined,
          senderType: Role.USER,
          receiverType: Role.COACH,
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'message-2',
          content: 'Message 2',
          senderId: 'sender-2',
          receiverId: 'user-123',
          sessionId: undefined,
          senderType: Role.COACH,
          receiverType: Role.USER,
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockService.findAll.mockResolvedValue(mockMessages);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedGet('/api/messages', userToken);

      expect(mockService.findAll).toHaveBeenCalledWith('user-123', expect.any(Object));
    });

    it('should pass query parameters to service', async () => {
      mockService.findAll.mockResolvedValue([]);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedGet(
        '/api/messages?sessionId=session-123' as '/api/messages',
        userToken
      );

      expect(mockService.findAll).toHaveBeenCalledWith('user-123', {
        sessionId: 'session-123',
      });
    });

    it('should pass conversationWith query parameter to service', async () => {
      mockService.findAll.mockResolvedValue([]);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedGet(
        '/api/messages?conversationWith=other-user-123' as '/api/messages',
        userToken
      );

      expect(mockService.findAll).toHaveBeenCalledWith('user-123', {
        conversationWith: 'other-user-123',
      });
    });
  });

  describe('GET /messages/conversation/:userId', () => {
    it('should call findConversation service method with correct parameters', async () => {
      const mockMessages: MessageResponseDto[] = [
        {
          id: 'message-1',
          content: 'Message 1',
          senderId: 'user-123',
          receiverId: 'other-user-123',
          sessionId: undefined,
          senderType: Role.USER,
          receiverType: Role.COACH,
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockService.findConversation.mockResolvedValue(mockMessages);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedGet(
        '/api/messages/conversation/other-user-123' as '/api/messages/conversation/{userId}',
        userToken
      );

      expect(mockService.findConversation).toHaveBeenCalledWith('user-123', 'other-user-123');
    });
  });

  describe('GET /messages/session/:sessionId', () => {
    it('should call findBySession service method with correct parameters', async () => {
      const mockMessages: MessageResponseDto[] = [
        {
          id: 'message-1',
          content: 'Session message',
          senderId: 'user-123',
          receiverId: 'coach-123',
          sessionId: 'session-123',
          senderType: Role.USER,
          receiverType: Role.COACH,
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockService.findBySession.mockResolvedValue(mockMessages);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedGet(
        '/api/messages/session/session-123' as '/api/messages/session/{sessionId}',
        userToken
      );

      expect(mockService.findBySession).toHaveBeenCalledWith(
        'session-123',
        'user-123',
        Role.USER,
        expect.any(Object)
      );
    });

    it('should allow coach to view session messages', async () => {
      mockService.findBySession.mockResolvedValue([]);

      const coachToken = await test.auth.createRoleToken(Role.COACH, {
        sub: 'coach-123',
      });
      await test.http.authenticatedGet(
        '/api/messages/session/session-123' as '/api/messages/session/{sessionId}',
        coachToken
      );

      expect(mockService.findBySession).toHaveBeenCalledWith(
        'session-123',
        'coach-123',
        Role.COACH,
        expect.any(Object)
      );
    });
  });

  describe('GET /messages/:id', () => {
    it('should call findOne service method with correct parameters', async () => {
      const mockMessage: MessageResponseDto = {
        id: 'message-123',
        content: 'Test message',
        senderId: 'user-123',
        receiverId: 'receiver-123',
        sessionId: undefined,
        senderType: Role.USER,
        receiverType: Role.COACH,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.findOne.mockResolvedValue(mockMessage);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedGet(
        '/api/messages/message-123' as '/api/messages/{id}',
        userToken
      );

      expect(mockService.findOne).toHaveBeenCalledWith('message-123', 'user-123');
    });
  });
});
