import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ServiceTest } from '@test-utils';

import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';

import { MessagesService } from './messages.service';

interface MessageMocks {
  PrismaService: {
    message: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
    account: {
      findUnique: jest.Mock;
    };
  };
  SessionsService: {
    findOne: jest.Mock;
  };
  AccountsService: {
    findOne: jest.Mock;
    existsById: jest.Mock;
  };
}

describe('MessagesService', () => {
  let test: ServiceTest<MessagesService, MessageMocks>;

  beforeEach(async () => {
    test = new ServiceTest({
      service: MessagesService,
      providers: [
        {
          provide: PrismaService,
          useValue: {
            message: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
            },
            account: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: SessionsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: AccountsService,
          useValue: {
            findOne: jest.fn(),
            existsById: jest.fn(),
          },
        },
      ],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('findMessageInternal behavior', () => {
    describe('throwIfNotFound option', () => {
      it('should throw NotFoundException when throwIfNotFound=true and no results (via findById)', async () => {
        test.mocks.PrismaService.message.findFirst.mockResolvedValue(null);

        await expect(test.service.findById('non-existent')).rejects.toThrow(NotFoundException);
        await expect(test.service.findById('non-existent')).rejects.toThrow('Message not found');
      });

      it('should return empty array when throwIfNotFound=false and no results (via findBySessionId)', async () => {
        test.mocks.PrismaService.message.findMany.mockResolvedValue([]);

        const result = await test.service.findBySessionId('non-existent-session');

        expect(result).toEqual([]);
      });
    });

    describe('isMany option', () => {
      it('should return array when isMany=true (via findBySessionId)', async () => {
        const mockMessages = [
          test.factory.message.createWithNulls({ content: 'Message 1' }),
          test.factory.message.createWithNulls({ content: 'Message 2' }),
        ];
        test.mocks.PrismaService.message.findMany.mockResolvedValue(mockMessages);

        const result = await test.service.findBySessionId('session-123');

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(test.mocks.PrismaService.message.findMany).toHaveBeenCalled();
      });

      it('should return single object when isMany=false (via findById)', async () => {
        const mockMessage = test.factory.message.createWithNulls({ id: 'message-123' });
        test.mocks.PrismaService.message.findFirst.mockResolvedValue(mockMessage);

        const result = await test.service.findById('message-123');

        expect(Array.isArray(result)).toBe(false);
        expect(result.id).toBe('message-123');
        expect(test.mocks.PrismaService.message.findFirst).toHaveBeenCalled();
      });
    });

    describe('include option', () => {
      it('should include sender and receiver relations in queries', async () => {
        const mockMessage = test.factory.message.createWithNulls();
        test.mocks.PrismaService.message.findFirst.mockResolvedValue(mockMessage);

        await test.service.findById('message-123');

        expect(test.mocks.PrismaService.message.findFirst).toHaveBeenCalledWith({
          where: { id: 'message-123' },
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
  });

  describe('findById (internal method)', () => {
    it('should return message when found', async () => {
      const mockMessage = test.factory.message.createWithNulls({ id: 'message-123' });
      test.mocks.PrismaService.message.findFirst.mockResolvedValue(mockMessage);

      const result = await test.service.findById('message-123');

      expect(result.id).toBe('message-123');
      expect(test.mocks.PrismaService.message.findFirst).toHaveBeenCalledWith({
        where: { id: 'message-123' },
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

    it('should throw NotFoundException when message not found', async () => {
      test.mocks.PrismaService.message.findFirst.mockResolvedValue(null);

      await expect(test.service.findById('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySessionId (internal method)', () => {
    it('should return messages for session when found', async () => {
      const mockMessages = [
        test.factory.message.createWithNulls({ sessionId: 'session-123' }),
        test.factory.message.createWithNulls({ sessionId: 'session-123' }),
      ];
      test.mocks.PrismaService.message.findMany.mockResolvedValue(mockMessages);

      const result = await test.service.findBySessionId('session-123');

      expect(result).toHaveLength(2);
      expect(test.mocks.PrismaService.message.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-123' },
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
        orderBy: { sentAt: 'desc' },
      });
    });

    it('should return empty array when no messages found', async () => {
      test.mocks.PrismaService.message.findMany.mockResolvedValue([]);

      const result = await test.service.findBySessionId('session-456');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const createDto = {
      content: 'Hello, I have a question',
      receiverId: 'receiver-123',
    };

    it('should create a message successfully', async () => {
      const mockReceiver = { id: 'receiver-123', role: Role.COACH };
      const mockMessage = test.factory.message.createWithNulls({
        content: createDto.content,
        senderId: 'user-123',
        receiverId: createDto.receiverId,
        senderType: Role.USER,
        receiverType: Role.COACH,
      });

      test.mocks.AccountsService.existsById.mockResolvedValue(mockReceiver);
      test.mocks.PrismaService.message.create.mockResolvedValue(mockMessage);

      const result = await test.service.create(createDto, 'user-123', Role.USER);

      expect(result.content).toBe(createDto.content);
      expect(test.mocks.AccountsService.existsById).toHaveBeenCalledWith(createDto.receiverId);
      expect(test.mocks.PrismaService.message.create).toHaveBeenCalledWith({
        data: {
          content: createDto.content,
          sessionId: null,
          senderId: 'user-123',
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
      const createDtoWithSession = {
        ...createDto,
        sessionId: 'session-123',
      };
      const mockReceiver = { id: 'receiver-123', role: Role.COACH };
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        coachId: 'receiver-123',
      };
      const mockMessage = test.factory.message.createWithNulls({
        content: createDtoWithSession.content,
        sessionId: 'session-123',
      });

      test.mocks.AccountsService.existsById.mockResolvedValue(mockReceiver);
      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
      test.mocks.PrismaService.message.create.mockResolvedValue(mockMessage);

      const result = await test.service.create(createDtoWithSession, 'user-123', Role.USER);

      expect(result.sessionId).toBe('session-123');
      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(
        'session-123',
        'user-123',
        Role.USER
      );
    });

    it('should throw NotFoundException when receiver not found', async () => {
      test.mocks.AccountsService.existsById.mockResolvedValue(null);

      await expect(test.service.create(createDto, 'user-123', Role.USER)).rejects.toThrow(
        NotFoundException
      );
      await expect(test.service.create(createDto, 'user-123', Role.USER)).rejects.toThrow(
        'Receiver not found'
      );
      expect(test.mocks.PrismaService.message.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user not authorized for session', async () => {
      const createDtoWithSession = {
        ...createDto,
        sessionId: 'session-123',
      };
      const mockReceiver = { id: 'receiver-123', role: Role.COACH };
      const mockSession = {
        id: 'session-123',
        userId: 'other-user',
        coachId: 'other-coach',
      };

      test.mocks.AccountsService.existsById.mockResolvedValue(mockReceiver);
      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      await expect(
        test.service.create(createDtoWithSession, 'user-123', Role.USER)
      ).rejects.toThrow(ForbiddenException);
      expect(test.mocks.PrismaService.message.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all messages for a user', async () => {
      const mockMessages = [
        test.factory.message.createWithNulls({ senderId: 'user-123' }),
        test.factory.message.createWithNulls({ receiverId: 'user-123' }),
      ];
      test.mocks.PrismaService.message.findMany.mockResolvedValue(mockMessages);

      const result = await test.service.findAll('user-123', {});

      expect(result).toHaveLength(2);
      expect(test.mocks.PrismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ senderId: 'user-123' }, { receiverId: 'user-123' }],
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
        orderBy: { sentAt: 'desc' },
      });
    });

    it('should filter messages by sessionId', async () => {
      test.mocks.PrismaService.message.findMany.mockResolvedValue([]);

      await test.service.findAll('user-123', { sessionId: 'session-123' });

      expect(test.mocks.PrismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ senderId: 'user-123' }, { receiverId: 'user-123' }],
          sessionId: 'session-123',
        },
        include: expect.any(Object),
        orderBy: { sentAt: 'desc' },
      });
    });

    it('should filter messages by conversationWith', async () => {
      test.mocks.PrismaService.message.findMany.mockResolvedValue([]);

      await test.service.findAll('user-123', { conversationWith: 'other-user' });

      expect(test.mocks.PrismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { senderId: 'user-123', receiverId: 'other-user' },
            { senderId: 'other-user', receiverId: 'user-123' },
          ],
        },
        include: expect.any(Object),
        orderBy: { sentAt: 'desc' },
      });
    });

    it('should return empty array when no messages found', async () => {
      test.mocks.PrismaService.message.findMany.mockResolvedValue([]);

      const result = await test.service.findAll('user-123', {});

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return message when user is sender', async () => {
      const mockMessage = test.factory.message.createWithNulls({
        id: 'message-123',
        senderId: 'user-123',
        receiverId: 'other-user',
      });
      test.mocks.PrismaService.message.findFirst.mockResolvedValue(mockMessage);

      const result = await test.service.findOne('message-123', 'user-123');

      expect(result.id).toBe('message-123');
    });

    it('should return message when user is receiver', async () => {
      const mockMessage = test.factory.message.createWithNulls({
        id: 'message-123',
        senderId: 'other-user',
        receiverId: 'user-123',
      });
      test.mocks.PrismaService.message.findFirst.mockResolvedValue(mockMessage);

      const result = await test.service.findOne('message-123', 'user-123');

      expect(result.id).toBe('message-123');
    });

    it('should throw NotFoundException when message not found', async () => {
      test.mocks.PrismaService.message.findFirst.mockResolvedValue(null);

      await expect(test.service.findOne('non-existent', 'user-123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user not authorized', async () => {
      const mockMessage = test.factory.message.createWithNulls({
        id: 'message-123',
        senderId: 'other-sender',
        receiverId: 'other-receiver',
      });
      test.mocks.PrismaService.message.findFirst.mockResolvedValue(mockMessage);

      await expect(test.service.findOne('message-123', 'user-123')).rejects.toThrow(
        ForbiddenException
      );
      await expect(test.service.findOne('message-123', 'user-123')).rejects.toThrow(
        'Not authorized to view this message'
      );
    });
  });

  describe('findConversation', () => {
    it('should return conversation between two users', async () => {
      const mockMessages = test.factory.message.createConversation('user-123', 'other-user', 4);
      test.mocks.PrismaService.message.findMany.mockResolvedValue(mockMessages);

      const result = await test.service.findConversation('user-123', 'other-user');

      expect(result).toHaveLength(4);
      expect(test.mocks.PrismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { senderId: 'user-123', receiverId: 'other-user' },
            { senderId: 'other-user', receiverId: 'user-123' },
          ],
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
        orderBy: { sentAt: 'desc' },
      });
    });

    it('should return empty array when no conversation exists', async () => {
      test.mocks.PrismaService.message.findMany.mockResolvedValue([]);

      const result = await test.service.findConversation('user-123', 'other-user');

      expect(result).toEqual([]);
    });
  });

  describe('findBySession', () => {
    it('should return messages for session when user is authorized', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-123',
      };
      const mockMessages = [test.factory.message.createWithNulls({ sessionId: 'session-123' })];

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
      test.mocks.PrismaService.message.findMany.mockResolvedValue(mockMessages);

      const result = await test.service.findBySession('session-123', 'user-123', Role.USER, {});

      expect(result).toHaveLength(1);
      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(
        'session-123',
        'user-123',
        Role.USER
      );
    });

    it('should allow coach to view session messages', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-123',
      };

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
      test.mocks.PrismaService.message.findMany.mockResolvedValue([]);

      await test.service.findBySession('session-123', 'coach-123', Role.COACH, {});

      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(
        'session-123',
        'coach-123',
        Role.COACH
      );
      expect(test.mocks.PrismaService.message.findMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException when session not found', async () => {
      test.mocks.SessionsService.findOne.mockResolvedValue(null);

      await expect(
        test.service.findBySession('non-existent', 'user-123', Role.USER, {})
      ).rejects.toThrow(NotFoundException);
      expect(test.mocks.PrismaService.message.findMany).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user not authorized for session', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'other-user',
        coachId: 'other-coach',
      };

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      await expect(
        test.service.findBySession('session-123', 'user-123', Role.USER, {})
      ).rejects.toThrow(ForbiddenException);
      expect(test.mocks.PrismaService.message.findMany).not.toHaveBeenCalled();
    });
  });
});
