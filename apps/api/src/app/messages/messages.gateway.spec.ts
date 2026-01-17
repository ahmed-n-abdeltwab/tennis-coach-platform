import { MessageType, Role } from '@prisma/client';
import { GatewayTest, MockSocketClient } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { CreateMessageDto } from './dto/message.dto';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';

interface MessagesGatewayMocks {
  MessagesService: DeepMocked<MessagesService>;
}

describe('MessagesGateway', () => {
  let test: GatewayTest<MessagesGateway, MessagesGatewayMocks>;
  let mockSocket: MockSocketClient;

  beforeEach(async () => {
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

  describe('handleConnection', () => {
    it('should handle client connection', () => {
      expect(() => test.gateway.handleConnection(mockSocket.socket)).not.toThrow();
    });
  });

  describe('handleDisconnect', () => {
    it('should handle client disconnection and remove from connected clients', () => {
      const disconnectSocket = test.createMockClient('disconnect-socket-id');

      test.gateway.handleJoinSession(disconnectSocket.socket, {
        sessionId: 'csession123456789012345',
        userId: 'cuser12345678901234567',
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
        sessionId: 'csession123456789012345',
        userId: 'cuser12345678901234567',
        role: Role.USER,
      };

      await test.gateway.handleJoinSession(mockSocket.socket, data);

      expect(mockSocket.join).toHaveBeenCalledWith('session-csession123456789012345');
    });

    it('should add client to connected clients map', async () => {
      const data = {
        sessionId: 'csession456789012345678',
        userId: 'cuser23456789012345678',
        role: Role.COACH,
      };

      await test.gateway.handleJoinSession(mockSocket.socket, data);

      expect(mockSocket.join).toHaveBeenCalledWith('session-csession456789012345678');
    });

    it('should allow coach to join session', async () => {
      const data = {
        sessionId: 'csession789012345678901',
        userId: 'ccoach1234567890123456',
        role: Role.COACH,
      };

      await test.gateway.handleJoinSession(mockSocket.socket, data);

      expect(mockSocket.join).toHaveBeenCalledWith('session-csession789012345678901');
    });
  });

  describe('handleSendMessage', () => {
    it('should create message and emit to session room', async () => {
      const mockUser = test.factory.auth.createUserPayload({ sub: 'cuser12345678901234567' });
      const createDto: CreateMessageDto = {
        content: 'Hello, coach!',
        receiverId: 'ccoach1234567890123456',
        sessionId: 'csession123456789012345',
      };

      const expectedMessage = test.factory.message.createWithNulls({
        id: 'cmessage12345678901234',
        content: 'Hello, coach!',
        senderId: 'cuser12345678901234567',
        receiverId: 'ccoach1234567890123456',
        sessionId: 'csession123456789012345',
        senderType: Role.USER,
        receiverType: Role.COACH,
        messageType: MessageType.TEXT,
      });

      test.mocks.MessagesService.create.mockResolvedValue(expectedMessage);

      const result = await test.gateway.handleSendMessage(createDto, mockUser);

      expect(result).toEqual(expectedMessage);
      expect(test.mocks.MessagesService.create).toHaveBeenCalledWith(
        createDto,
        'cuser12345678901234567',
        Role.USER
      );
      expect(test.server.to).toHaveBeenCalledWith('session-csession123456789012345');
    });

    it('should allow coach to send message', async () => {
      const mockCoach = test.factory.auth.createCoachPayload({ sub: 'ccoach1234567890123456' });
      const createDto: CreateMessageDto = {
        content: 'Hello, user!',
        receiverId: 'cuser12345678901234567',
        sessionId: 'csession123456789012345',
      };

      const expectedMessage = test.factory.message.createWithNulls({
        id: 'cmessage23456789012345',
        content: 'Hello, user!',
        senderId: 'ccoach1234567890123456',
        receiverId: 'cuser12345678901234567',
        sessionId: 'csession123456789012345',
        senderType: Role.COACH,
        receiverType: Role.USER,
        messageType: MessageType.TEXT,
      });

      test.mocks.MessagesService.create.mockResolvedValue(expectedMessage);

      const result = await test.gateway.handleSendMessage(createDto, mockCoach);

      expect(result).toEqual(expectedMessage);
      expect(test.mocks.MessagesService.create).toHaveBeenCalledWith(
        createDto,
        'ccoach1234567890123456',
        Role.COACH
      );
    });

    it('should not emit to session room when sessionId is not provided', async () => {
      const mockUser = test.factory.auth.createUserPayload({ sub: 'cuser12345678901234567' });
      const createDto: CreateMessageDto = {
        content: 'Direct message',
        receiverId: 'ccoach1234567890123456',
      };

      const expectedMessage = test.factory.message.createWithNulls({
        id: 'cmessage34567890123456',
        content: 'Direct message',
        senderId: 'cuser12345678901234567',
        receiverId: 'ccoach1234567890123456',
        sessionId: undefined,
        senderType: Role.USER,
        receiverType: Role.COACH,
        messageType: MessageType.TEXT,
      });

      test.mocks.MessagesService.create.mockResolvedValue(expectedMessage);

      const result = await test.gateway.handleSendMessage(createDto, mockUser);

      expect(result).toEqual(expectedMessage);
      expect(test.mocks.MessagesService.create).toHaveBeenCalledWith(
        createDto,
        'cuser12345678901234567',
        Role.USER
      );
      // Should emit to user rooms for direct messaging, but not to session room
      expect(test.server.to).toHaveBeenCalledWith('user-ccoach1234567890123456');
      expect(test.server.to).toHaveBeenCalledWith('user-cuser12345678901234567');
      expect(test.server.to).not.toHaveBeenCalledWith(expect.stringContaining('session-'));
    });

    it('should handle service errors gracefully', async () => {
      const mockUser = test.factory.auth.createUserPayload({ sub: 'cuser12345678901234567' });
      const createDto: CreateMessageDto = {
        content: 'Test message',
        receiverId: 'ccoach1234567890123456',
        sessionId: 'csession123456789012345',
      };

      test.mocks.MessagesService.create.mockRejectedValue(new Error('Service error'));

      await expect(test.gateway.handleSendMessage(createDto, mockUser)).rejects.toThrow(
        'Service error'
      );
    });
  });

  describe('handleLeaveSession', () => {
    it('should leave client from session room', async () => {
      const data = { sessionId: 'csession123456789012345' };

      await test.gateway.handleLeaveSession(mockSocket.socket, data);

      expect(mockSocket.leave).toHaveBeenCalledWith('session-csession123456789012345');
    });

    it('should handle leaving non-existent session', async () => {
      const data = { sessionId: 'cnonexistentsession12345' };

      await expect(test.gateway.handleLeaveSession(mockSocket.socket, data)).resolves.not.toThrow();
      expect(mockSocket.leave).toHaveBeenCalledWith('session-cnonexistentsession12345');
    });
  });

  describe('WebSocket server', () => {
    it('should have server property decorated with @WebSocketServer', () => {
      expect(test.gateway.server).toBeDefined();
      expect(test.gateway.server).toBe(test.server);
    });
  });
});
