import { Role } from '@prisma/client';
import { AuthMockFactory, GatewayTest, MessageMockFactory, MockSocketClient } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { CreateMessageDto, MessageResponseDto } from './dto/message.dto';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';

interface MessagesGatewayMocks {
  MessagesService: DeepMocked<MessagesService>;
}

describe('MessagesGateway', () => {
  let test: GatewayTest<MessagesGateway, MessagesGatewayMocks>;
  let mockSocket: MockSocketClient;
  let authFactory: AuthMockFactory;
  let messageFactory: MessageMockFactory;

  beforeEach(async () => {
    authFactory = new AuthMockFactory();
    messageFactory = new MessageMockFactory();

    test = new GatewayTest<MessagesGateway, MessagesGatewayMocks>({
      gateway: MessagesGateway,
      providers: [MessagesService],
    });

    await test.setup();
    mockSocket = test.createMockClient();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  function createMockMessageResponse(overrides?: Partial<MessageResponseDto>): MessageResponseDto {
    const mockMessage = messageFactory.create();
    return {
      id: mockMessage.id,
      content: mockMessage.content,
      sentAt: mockMessage.sentAt,
      senderId: mockMessage.senderId ?? 'sender-id',
      receiverId: mockMessage.receiverId ?? 'receiver-id',
      sessionId: mockMessage.sessionId,
      senderType: mockMessage.senderType,
      receiverType: mockMessage.receiverType,
      createdAt: mockMessage.sentAt,
      updatedAt: mockMessage.sentAt,
      ...overrides,
    };
  }

  describe('handleConnection', () => {
    it('should handle client connection', () => {
      expect(() => test.gateway.handleConnection(mockSocket.socket)).not.toThrow();
    });
  });

  describe('handleDisconnect', () => {
    it('should handle client disconnection and remove from connected clients', () => {
      const disconnectSocket = test.createMockClient('disconnect-socket-id');

      test.gateway.handleJoinSession(disconnectSocket.socket, {
        sessionId: 'session-1',
        userId: 'user-1',
        role: Role.USER,
      });

      test.gateway.handleDisconnect(disconnectSocket.socket);

      expect(() => test.gateway.handleDisconnect(disconnectSocket.socket)).not.toThrow();
    });

    it('should handle disconnection of client that was never connected', () => {
      expect(() => test.gateway.handleDisconnect(mockSocket.socket)).not.toThrow();
    });
  });

  describe('handleJoinSession', () => {
    it('should join client to session room', async () => {
      const data = {
        sessionId: 'session-123',
        userId: 'user-1',
        role: Role.USER,
      };

      await test.gateway.handleJoinSession(mockSocket.socket, data);

      expect(mockSocket.join).toHaveBeenCalledWith('session-session-123');
    });

    it('should add client to connected clients map', async () => {
      const data = {
        sessionId: 'session-456',
        userId: 'user-2',
        role: Role.COACH,
      };

      await test.gateway.handleJoinSession(mockSocket.socket, data);

      expect(mockSocket.join).toHaveBeenCalledWith('session-session-456');
    });

    it('should allow coach to join session', async () => {
      const data = {
        sessionId: 'session-789',
        userId: 'coach-1',
        role: Role.COACH,
      };

      await test.gateway.handleJoinSession(mockSocket.socket, data);

      expect(mockSocket.join).toHaveBeenCalledWith('session-session-789');
    });
  });

  describe('handleSendMessage', () => {
    it('should create message and emit to session room', async () => {
      const mockUser = authFactory.createUserPayload({ sub: 'user-1' });
      const createDto: CreateMessageDto = {
        content: 'Hello, coach!',
        receiverId: 'coach-1',
        sessionId: 'session-123',
      };

      const expectedMessage = createMockMessageResponse({
        id: 'message-1',
        content: 'Hello, coach!',
        senderId: 'user-1',
        receiverId: 'coach-1',
        sessionId: 'session-123',
        senderType: Role.USER,
        receiverType: Role.COACH,
      });

      test.mocks.MessagesService.create.mockResolvedValue(expectedMessage);

      const result = await test.gateway.handleSendMessage(createDto, mockUser);

      expect(result).toEqual(expectedMessage);
      expect(test.mocks.MessagesService.create).toHaveBeenCalledWith(
        createDto,
        'user-1',
        Role.USER
      );
      expect(test.server.to).toHaveBeenCalledWith('session-session-123');
    });

    it('should allow coach to send message', async () => {
      const mockCoach = authFactory.createCoachPayload({ sub: 'coach-1' });
      const createDto: CreateMessageDto = {
        content: 'Hello, user!',
        receiverId: 'user-1',
        sessionId: 'session-123',
      };

      const expectedMessage = createMockMessageResponse({
        id: 'message-2',
        content: 'Hello, user!',
        senderId: 'coach-1',
        receiverId: 'user-1',
        sessionId: 'session-123',
        senderType: Role.COACH,
        receiverType: Role.USER,
      });

      test.mocks.MessagesService.create.mockResolvedValue(expectedMessage);

      const result = await test.gateway.handleSendMessage(createDto, mockCoach);

      expect(result).toEqual(expectedMessage);
      expect(test.mocks.MessagesService.create).toHaveBeenCalledWith(
        createDto,
        'coach-1',
        Role.COACH
      );
    });

    it('should not emit to room when sessionId is not provided', async () => {
      const mockUser = authFactory.createUserPayload({ sub: 'user-1' });
      const createDto: CreateMessageDto = {
        content: 'Direct message',
        receiverId: 'coach-1',
      };

      const expectedMessage = createMockMessageResponse({
        id: 'message-3',
        content: 'Direct message',
        senderId: 'user-1',
        receiverId: 'coach-1',
        sessionId: undefined,
        senderType: Role.USER,
        receiverType: Role.COACH,
      });

      test.mocks.MessagesService.create.mockResolvedValue(expectedMessage);

      const result = await test.gateway.handleSendMessage(createDto, mockUser);

      expect(result).toEqual(expectedMessage);
      expect(test.mocks.MessagesService.create).toHaveBeenCalledWith(
        createDto,
        'user-1',
        Role.USER
      );
      expect(test.server.to).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      const mockUser = authFactory.createUserPayload({ sub: 'user-1' });
      const createDto: CreateMessageDto = {
        content: 'Test message',
        receiverId: 'coach-1',
        sessionId: 'session-123',
      };

      test.mocks.MessagesService.create.mockRejectedValue(new Error('Service error'));

      await expect(test.gateway.handleSendMessage(createDto, mockUser)).rejects.toThrow(
        'Service error'
      );
    });
  });

  describe('handleLeaveSession', () => {
    it('should leave client from session room', async () => {
      const data = { sessionId: 'session-123' };

      await test.gateway.handleLeaveSession(mockSocket.socket, data);

      expect(mockSocket.leave).toHaveBeenCalledWith('session-session-123');
    });

    it('should handle leaving non-existent session', async () => {
      const data = { sessionId: 'non-existent-session' };

      await expect(test.gateway.handleLeaveSession(mockSocket.socket, data)).resolves.not.toThrow();
      expect(mockSocket.leave).toHaveBeenCalledWith('session-non-existent-session');
    });
  });

  describe('WebSocket server', () => {
    it('should have server property decorated with @WebSocketServer', () => {
      expect(test.gateway.server).toBeDefined();
      expect(test.gateway.server).toBe(test.server);
    });
  });
});
