import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ServiceTest } from '@test-utils';

import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';

import { CreateMessageDto, GetMessagesQuery } from './dto/message.dto';
import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  let test: ServiceTest<MessagesService, PrismaService>;
  let mockSessionsService: jest.Mocked<SessionsService>;

  beforeEach(async () => {
    mockSessionsService = {
      findUnique: jest.fn(),
    } as any;

    const mockPrisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      message: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      account: {
        findUnique: jest.fn(),
      },
    };

    test = new ServiceTest({
      serviceClass: MessagesService,
      mocks: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SessionsService, useValue: mockSessionsService },
      ],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('create', () => {
    it('should create a message successfully', async () => {
      const userId = 'user-123';
      const createDto: CreateMessageDto = {
        content: 'Hello, I have a question',
        receiverId: 'receiver-123',
      };

      const mockReceiver = {
        id: 'receiver-123',
        role: Role.COACH,
      };

      const mockCreatedMessage = {
        id: 'message-123',
        content: createDto.content,
        senderId: userId,
        receiverId: createDto.receiverId,
        sessionId: null,
        senderType: Role.USER,
        receiverType: Role.COACH,
        sentAt: new Date('2024-11-10T10:00:00Z'),
        sender: {
          id: userId,
          name: 'User Name',
          email: 'user@example.com',
        },
        receiver: {
          id: 'receiver-123',
          name: 'Receiver Name',
          email: 'receiver@example.com',
        },
      };

      test.prisma.account.findUnique.mockResolvedValue(mockReceiver as any);
      test.prisma.message.create.mockResolvedValue(mockCreatedMessage as any);

      const result = await test.service.create(createDto, userId, Role.USER);

      expect(result).toMatchObject({
        id: 'message-123',
        content: createDto.content,
        senderId: userId,
        receiverId: createDto.receiverId,
      });
      expect(test.prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.receiverId },
        select: { id: true, role: true },
      });
      expect(test.prisma.message.create).toHaveBeenCalledWith({
        data: {
          content: createDto.content,
          sessionId: null,
          senderId: userId,
          receiverId: createDto.receiverId,
          senderType: Role.USER,
          receiverType: Role.COACH,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should create a message with sessionId', async () => {
      const userId = 'user-123';
      const createDto: CreateMessageDto = {
        content: 'Session related message',
        receiverId: 'coach-123',
        sessionId: 'session-123',
      };

      const mockReceiver = {
        id: 'coach-123',
        role: Role.COACH,
      };

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-123',
      };

      const mockCreatedMessage = {
        id: 'message-123',
        content: createDto.content,
        senderId: userId,
        receiverId: createDto.receiverId,
        sessionId: createDto.sessionId,
        senderType: Role.USER,
        receiverType: Role.COACH,
        sentAt: new Date('2024-11-10T10:00:00Z'),
        sender: {
          id: userId,
          name: 'User Name',
          email: 'user@example.com',
        },
        receiver: {
          id: 'coach-123',
          name: 'Coach Name',
          email: 'coach@example.com',
        },
      };

      test.prisma.account.findUnique.mockResolvedValue(mockReceiver as any);
      mockSessionsService.findUnique.mockResolvedValue(mockSession as any);
      test.prisma.message.create.mockResolvedValue(mockCreatedMessage as any);

      const result = await test.service.create(createDto, userId, Role.USER);

      expect(result.sessionId).toBe('session-123');
      expect(mockSessionsService.findUnique).toHaveBeenCalledWith('session-123');
    });

    it('should throw NotFoundException when receiver not found', async () => {
      const createDto: CreateMessageDto = {
        content: 'Hello',
        receiverId: 'non-existent',
      };

      test.prisma.account.findUnique.mockResolvedValue(null);

      await expect(test.service.create(createDto, 'user-123', Role.USER)).rejects.toThrow(
        NotFoundException
      );
      expect(test.prisma.message.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when session not found', async () => {
      const createDto: CreateMessageDto = {
        content: 'Hello',
        receiverId: 'receiver-123',
        sessionId: 'non-existent',
      };

      const mockReceiver = {
        id: 'receiver-123',
        role: Role.COACH,
      };

      test.prisma.account.findUnique.mockResolvedValue(mockReceiver as any);
      mockSessionsService.findUnique.mockResolvedValue(null);

      await expect(test.service.create(createDto, 'user-123', Role.USER)).rejects.toThrow(
        NotFoundException
      );
      expect(test.prisma.message.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user not authorized for session', async () => {
      const createDto: CreateMessageDto = {
        content: 'Hello',
        receiverId: 'receiver-123',
        sessionId: 'session-123',
      };

      const mockReceiver = {
        id: 'receiver-123',
        role: Role.COACH,
      };

      const mockSession = {
        id: 'session-123',
        userId: 'other-user',
        coachId: 'coach-123',
      };

      test.prisma.account.findUnique.mockResolvedValue(mockReceiver as any);
      mockSessionsService.findUnique.mockResolvedValue(mockSession as any);

      await expect(test.service.create(createDto, 'user-123', Role.USER)).rejects.toThrow(
        ForbiddenException
      );
      expect(test.prisma.message.create).not.toHaveBeenCalled();
    });

    it('should allow coach to send message for their session', async () => {
      const coachId = 'coach-123';
      const createDto: CreateMessageDto = {
        content: 'Coach message',
        receiverId: 'user-123',
        sessionId: 'session-123',
      };

      const mockReceiver = {
        id: 'user-123',
        role: Role.USER,
      };

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-123',
      };

      const mockCreatedMessage = {
        id: 'message-123',
        content: createDto.content,
        senderId: coachId,
        receiverId: createDto.receiverId,
        sessionId: createDto.sessionId,
        senderType: Role.COACH,
        receiverType: Role.USER,
        sentAt: new Date('2024-11-10T10:00:00Z'),
        sender: {
          id: coachId,
          name: 'Coach Name',
          email: 'coach@example.com',
        },
        receiver: {
          id: 'user-123',
          name: 'User Name',
          email: 'user@example.com',
        },
      };

      test.prisma.account.findUnique.mockResolvedValue(mockReceiver as any);
      mockSessionsService.findUnique.mockResolvedValue(mockSession as any);
      test.prisma.message.create.mockResolvedValue(mockCreatedMessage as any);

      const result = await test.service.create(createDto, coachId, Role.COACH);

      expect(result.senderId).toBe(coachId);
      expect(result.senderType).toBe(Role.COACH);
    });
  });

  describe('findAll', () => {
    it('should return all messages for a user', async () => {
      const userId = 'user-123';
      const mockMessages = [
        {
          id: 'message-1',
          content: 'Message 1',
          senderId: userId,
          receiverId: 'receiver-1',
          sessionId: null,
          senderType: Role.USER,
          receiverType: Role.COACH,
          sentAt: new Date('2024-11-10T10:00:00Z'),
          sender: {
            id: userId,
            name: 'User Name',
            email: 'user@example.com',
          },
          receiver: {
            id: 'receiver-1',
            name: 'Receiver Name',
            email: 'receiver@example.com',
          },
        },
        {
          id: 'message-2',
          content: 'Message 2',
          senderId: 'sender-2',
          receiverId: userId,
          sessionId: null,
          senderType: Role.COACH,
          receiverType: Role.USER,
          sentAt: new Date('2024-11-10T11:00:00Z'),
          sender: {
            id: 'sender-2',
            name: 'Sender Name',
            email: 'sender@example.com',
          },
          receiver: {
            id: userId,
            name: 'User Name',
            email: 'user@example.com',
          },
        },
      ];

      test.prisma.message.findMany.mockResolvedValue(mockMessages as any);

      const result = await test.service.findAll(userId, {});

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('message-1');
      expect(result[1]?.id).toBe('message-2');
      expect(test.prisma.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        orderBy: { sentAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should filter messages by sessionId', async () => {
      const userId = 'user-123';
      const query: GetMessagesQuery = {
        sessionId: 'session-123',
      };

      test.prisma.message.findMany.mockResolvedValue([]);

      await test.service.findAll(userId, query);

      expect(test.prisma.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
          sessionId: 'session-123',
        },
        orderBy: { sentAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter messages by conversationWith', async () => {
      const userId = 'user-123';
      const query: GetMessagesQuery = {
        conversationWith: 'other-user-123',
      };

      test.prisma.message.findMany.mockResolvedValue([]);

      await test.service.findAll(userId, query);

      expect(test.prisma.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { senderId: userId, receiverId: 'other-user-123' },
            { senderId: 'other-user-123', receiverId: userId },
          ],
        },
        orderBy: { sentAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  describe('findOne', () => {
    it('should return a message when user is sender', async () => {
      const userId = 'user-123';
      const messageId = 'message-123';
      const mockMessage = {
        id: messageId,
        content: 'Test message',
        senderId: userId,
        receiverId: 'receiver-123',
        sessionId: null,
        senderType: Role.USER,
        receiverType: Role.COACH,
        sentAt: new Date('2024-11-10T10:00:00Z'),
        sender: {
          id: userId,
          name: 'User Name',
          email: 'user@example.com',
        },
        receiver: {
          id: 'receiver-123',
          name: 'Receiver Name',
          email: 'receiver@example.com',
        },
      };

      test.prisma.message.findUnique.mockResolvedValue(mockMessage as any);

      const result = await test.service.findOne(messageId, userId);

      expect(result.id).toBe(messageId);
      expect(test.prisma.message.findUnique).toHaveBeenCalledWith({
        where: { id: messageId },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should return a message when user is receiver', async () => {
      const userId = 'user-123';
      const messageId = 'message-123';
      const mockMessage = {
        id: messageId,
        content: 'Test message',
        senderId: 'sender-123',
        receiverId: userId,
        sessionId: null,
        senderType: Role.COACH,
        receiverType: Role.USER,
        sentAt: new Date('2024-11-10T10:00:00Z'),
        sender: {
          id: 'sender-123',
          name: 'Sender Name',
          email: 'sender@example.com',
        },
        receiver: {
          id: userId,
          name: 'User Name',
          email: 'user@example.com',
        },
      };

      test.prisma.message.findUnique.mockResolvedValue(mockMessage as any);

      const result = await test.service.findOne(messageId, userId);

      expect(result.id).toBe(messageId);
    });

    it('should throw NotFoundException when message not found', async () => {
      test.prisma.message.findUnique.mockResolvedValue(null);

      await expect(test.service.findOne('non-existent', 'user-123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user not authorized', async () => {
      const mockMessage = {
        id: 'message-123',
        content: 'Test message',
        senderId: 'other-sender',
        receiverId: 'other-receiver',
        sessionId: null,
        senderType: Role.USER,
        receiverType: Role.COACH,
        sentAt: new Date('2024-11-10T10:00:00Z'),
        sender: {
          id: 'other-sender',
          name: 'Other Sender',
          email: 'sender@example.com',
        },
        receiver: {
          id: 'other-receiver',
          name: 'Other Receiver',
          email: 'receiver@example.com',
        },
      };

      test.prisma.message.findUnique.mockResolvedValue(mockMessage as any);

      await expect(test.service.findOne('message-123', 'user-123')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('findConversation', () => {
    it('should return conversation between two users', async () => {
      const userId = 'user-123';
      const otherUserId = 'other-user-123';
      const mockMessages = [
        {
          id: 'message-1',
          content: 'Message 1',
          senderId: userId,
          receiverId: otherUserId,
          sessionId: null,
          senderType: Role.USER,
          receiverType: Role.COACH,
          sentAt: new Date('2024-11-10T10:00:00Z'),
          sender: {
            id: userId,
            name: 'User Name',
            email: 'user@example.com',
          },
          receiver: {
            id: otherUserId,
            name: 'Other User Name',
            email: 'other@example.com',
          },
        },
        {
          id: 'message-2',
          content: 'Message 2',
          senderId: otherUserId,
          receiverId: userId,
          sessionId: null,
          senderType: Role.COACH,
          receiverType: Role.USER,
          sentAt: new Date('2024-11-10T11:00:00Z'),
          sender: {
            id: otherUserId,
            name: 'Other User Name',
            email: 'other@example.com',
          },
          receiver: {
            id: userId,
            name: 'User Name',
            email: 'user@example.com',
          },
        },
      ];

      test.prisma.message.findMany.mockResolvedValue(mockMessages as any);

      const result = await test.service.findConversation(userId, otherUserId);

      expect(result).toHaveLength(2);
      expect(test.prisma.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
        orderBy: { sentAt: 'asc' },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });
  });

  describe('findBySession', () => {
    it('should return messages for a session when user is authorized', async () => {
      const userId = 'user-123';
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        userId: 'user-123',
        coachId: 'coach-123',
      };

      const mockMessages = [
        {
          id: 'message-1',
          content: 'Session message',
          senderId: userId,
          receiverId: 'coach-123',
          sessionId,
          senderType: Role.USER,
          receiverType: Role.COACH,
          sentAt: new Date('2024-11-10T10:00:00Z'),
          sender: {
            id: userId,
            name: 'User Name',
            email: 'user@example.com',
          },
          receiver: {
            id: 'coach-123',
            name: 'Coach Name',
            email: 'coach@example.com',
          },
        },
      ];

      mockSessionsService.findUnique.mockResolvedValue(mockSession as any);
      test.prisma.message.findMany.mockResolvedValue(mockMessages as any);

      const result = await test.service.findBySession(sessionId, userId, Role.USER, {});

      expect(result).toHaveLength(1);
      expect(result[0]?.sessionId).toBe(sessionId);
      expect(mockSessionsService.findUnique).toHaveBeenCalledWith(sessionId);
      expect(test.prisma.message.findMany).toHaveBeenCalledWith({
        where: { sessionId },
        orderBy: { sentAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should allow coach to view session messages', async () => {
      const coachId = 'coach-123';
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        userId: 'user-123',
        coachId: 'coach-123',
      };

      mockSessionsService.findUnique.mockResolvedValue(mockSession as any);
      test.prisma.message.findMany.mockResolvedValue([]);

      await test.service.findBySession(sessionId, coachId, Role.COACH, {});

      expect(mockSessionsService.findUnique).toHaveBeenCalledWith(sessionId);
      expect(test.prisma.message.findMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException when session not found', async () => {
      mockSessionsService.findUnique.mockResolvedValue(null);

      await expect(
        test.service.findBySession('non-existent', 'user-123', Role.USER, {})
      ).rejects.toThrow(NotFoundException);
      expect(test.prisma.message.findMany).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user not authorized for session', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'other-user',
        coachId: 'coach-123',
      };

      mockSessionsService.findUnique.mockResolvedValue(mockSession as any);

      await expect(
        test.service.findBySession('session-123', 'user-123', Role.USER, {})
      ).rejects.toThrow(ForbiddenException);
      expect(test.prisma.message.findMany).not.toHaveBeenCalled();
    });
  });
});
