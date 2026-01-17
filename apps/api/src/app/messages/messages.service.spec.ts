import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ServiceTest } from '@test-utils';

import { AccountsService } from '../accounts/accounts.service';
import { ConversationsService } from '../conversations/conversations.service';
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
  ConversationsService: {
    findOrCreateByParticipants: jest.Mock;
    updateLastMessage: jest.Mock;
    existsWithParticipant: jest.Mock;
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
        {
          provide: ConversationsService,
          useValue: {
            findOrCreateByParticipants: jest.fn(),
            updateLastMessage: jest.fn(),
            existsWithParticipant: jest.fn(),
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

        await expect(test.service.findById('cnonexistent12345678901')).rejects.toThrow(
          NotFoundException
        );
        await expect(test.service.findById('cnonexistent12345678901')).rejects.toThrow(
          'Message not found'
        );
      });

      it('should return empty array when throwIfNotFound=false and no results (via findBySessionId)', async () => {
        test.mocks.PrismaService.message.findMany.mockResolvedValue([]);

        const result = await test.service.findBySessionId('cnonexistentsession12345');

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

        const result = await test.service.findBySessionId('csession123456789012345');

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(test.mocks.PrismaService.message.findMany).toHaveBeenCalled();
      });

      it('should return single object when isMany=false (via findById)', async () => {
        const mockMessage = test.factory.message.createWithNulls({ id: 'cmessage12345678901234' });
        test.mocks.PrismaService.message.findFirst.mockResolvedValue(mockMessage);

        const result = await test.service.findById('cmessage12345678901234');

        expect(Array.isArray(result)).toBe(false);
        expect(result.id).toBe('cmessage12345678901234');
        expect(test.mocks.PrismaService.message.findFirst).toHaveBeenCalled();
      });
    });

    describe('include option', () => {
      it('should include sender and receiver relations in queries', async () => {
        const mockMessage = test.factory.message.createWithNulls();
        test.mocks.PrismaService.message.findFirst.mockResolvedValue(mockMessage);

        await test.service.findById('cmessage12345678901234');

        expect(test.mocks.PrismaService.message.findFirst).toHaveBeenCalledWith({
          where: { id: 'cmessage12345678901234' },
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
      const mockMessage = test.factory.message.createWithNulls({ id: 'cmessage12345678901234' });
      test.mocks.PrismaService.message.findFirst.mockResolvedValue(mockMessage);

      const result = await test.service.findById('cmessage12345678901234');

      expect(result.id).toBe('cmessage12345678901234');
      expect(test.mocks.PrismaService.message.findFirst).toHaveBeenCalledWith({
        where: { id: 'cmessage12345678901234' },
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

      await expect(test.service.findById('cinvalidmessage12345678')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findBySessionId (internal method)', () => {
    it('should return messages for session when found', async () => {
      const mockMessages = [
        test.factory.message.createWithNulls({ sessionId: 'csession123456789012345' }),
        test.factory.message.createWithNulls({ sessionId: 'csession123456789012345' }),
      ];
      test.mocks.PrismaService.message.findMany.mockResolvedValue(mockMessages);

      const result = await test.service.findBySessionId('csession123456789012345');

      expect(result).toHaveLength(2);
      expect(test.mocks.PrismaService.message.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'csession123456789012345' },
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

      const result = await test.service.findBySessionId('csession456789012345678');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const senderId = 'cuser12345678901234567';
    const receiverId = 'creceiver1234567890123';
    const createDto = {
      content: 'Hello, I have a question',
      receiverId,
    };

    it('should create a message successfully', async () => {
      const mockReceiver = test.factory.account.createCoachWithNulls({ id: receiverId });
      const mockConversation = test.factory.conversation.createWithNulls({
        participantIds: [senderId, receiverId].sort(),
      });
      const mockMessage = test.factory.message.createWithNulls({
        content: createDto.content,
        senderId,
        receiverId: createDto.receiverId,
        senderType: Role.USER,
        receiverType: Role.COACH,
        conversationId: mockConversation.id,
      });

      test.mocks.AccountsService.existsById.mockResolvedValue(mockReceiver);
      test.mocks.ConversationsService.findOrCreateByParticipants.mockResolvedValue(
        mockConversation
      );
      test.mocks.ConversationsService.updateLastMessage.mockResolvedValue(undefined);
      test.mocks.PrismaService.message.create.mockResolvedValue(mockMessage);

      const result = await test.service.create(createDto, senderId, Role.USER);

      expect(result.content).toBe(createDto.content);
      expect(test.mocks.AccountsService.existsById).toHaveBeenCalledWith(createDto.receiverId);
      expect(test.mocks.ConversationsService.findOrCreateByParticipants).toHaveBeenCalledWith(
        [receiverId, senderId].sort()
      );
      expect(test.mocks.PrismaService.message.create).toHaveBeenCalledWith({
        data: {
          content: createDto.content,
          sessionId: null,
          senderId,
          receiverId: createDto.receiverId,
          senderType: Role.USER,
          receiverType: Role.COACH,
          messageType: 'TEXT',
          customServiceId: null,
          conversationId: mockConversation.id,
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
      const sessionId = 'csession123456789012345';
      const createDtoWithSession = {
        ...createDto,
        sessionId,
      };
      const mockReceiver = test.factory.account.createCoachWithNulls({ id: receiverId });
      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId: senderId,
        coachId: receiverId,
      });
      const mockConversation = test.factory.conversation.createWithNulls({
        participantIds: [senderId, receiverId].sort(),
      });
      const mockMessage = test.factory.message.createWithNulls({
        content: createDtoWithSession.content,
        sessionId,
        conversationId: mockConversation.id,
      });

      test.mocks.AccountsService.existsById.mockResolvedValue(mockReceiver);
      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
      test.mocks.ConversationsService.findOrCreateByParticipants.mockResolvedValue(
        mockConversation
      );
      test.mocks.ConversationsService.updateLastMessage.mockResolvedValue(undefined);
      test.mocks.PrismaService.message.create.mockResolvedValue(mockMessage);

      const result = await test.service.create(createDtoWithSession, senderId, Role.USER);

      expect(result.sessionId).toBe(sessionId);
      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(
        sessionId,
        senderId,
        Role.USER
      );
    });

    it('should create a BOOKING_REQUEST message', async () => {
      const createBookingRequestDto = {
        content: 'I would like to book a session for next week.',
        receiverId,
        messageType: 'BOOKING_REQUEST' as const,
      };
      const mockReceiver = test.factory.account.createCoachWithNulls({ id: receiverId });
      const mockConversation = test.factory.conversation.createWithNulls({
        participantIds: [senderId, receiverId].sort(),
      });
      const mockMessage = test.factory.message.createWithNulls({
        content: createBookingRequestDto.content,
        senderId,
        receiverId: createBookingRequestDto.receiverId,
        senderType: Role.USER,
        receiverType: Role.COACH,
        messageType: 'BOOKING_REQUEST',
        conversationId: mockConversation.id,
      });

      test.mocks.AccountsService.existsById.mockResolvedValue(mockReceiver);
      test.mocks.ConversationsService.findOrCreateByParticipants.mockResolvedValue(
        mockConversation
      );
      test.mocks.ConversationsService.updateLastMessage.mockResolvedValue(undefined);
      test.mocks.PrismaService.message.create.mockResolvedValue(mockMessage);

      const result = await test.service.create(createBookingRequestDto, senderId, Role.USER);

      expect(result.content).toBe(createBookingRequestDto.content);
      expect(result.messageType).toBe('BOOKING_REQUEST');
      expect(test.mocks.PrismaService.message.create).toHaveBeenCalledWith({
        data: {
          content: createBookingRequestDto.content,
          sessionId: null,
          senderId,
          receiverId: createBookingRequestDto.receiverId,
          senderType: Role.USER,
          receiverType: Role.COACH,
          messageType: 'BOOKING_REQUEST',
          customServiceId: null,
          conversationId: mockConversation.id,
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

    it('should throw NotFoundException when receiver not found', async () => {
      test.mocks.AccountsService.existsById.mockResolvedValue(null);

      await expect(test.service.create(createDto, senderId, Role.USER)).rejects.toThrow(
        NotFoundException
      );
      await expect(test.service.create(createDto, senderId, Role.USER)).rejects.toThrow(
        'Receiver not found'
      );
      expect(test.mocks.PrismaService.message.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user not authorized for session', async () => {
      const sessionId = 'csession123456789012345';
      const createDtoWithSession = {
        ...createDto,
        sessionId,
      };
      const mockReceiver = test.factory.account.createCoachWithNulls({ id: receiverId });
      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId: 'cotheruser12345678901',
        coachId: 'cothercoach1234567890',
      });

      test.mocks.AccountsService.existsById.mockResolvedValue(mockReceiver);
      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      await expect(test.service.create(createDtoWithSession, senderId, Role.USER)).rejects.toThrow(
        ForbiddenException
      );
      expect(test.mocks.PrismaService.message.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all messages for a user', async () => {
      const mockMessages = [
        test.factory.message.createWithNulls({ senderId: 'cuser12345678901234567' }),
        test.factory.message.createWithNulls({ receiverId: 'cuser12345678901234567' }),
      ];
      test.mocks.PrismaService.message.findMany.mockResolvedValue(mockMessages);

      const result = await test.service.findAll('cuser12345678901234567', {});

      expect(result).toHaveLength(2);
      expect(test.mocks.PrismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ senderId: 'cuser12345678901234567' }, { receiverId: 'cuser12345678901234567' }],
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

      await test.service.findAll('cuser12345678901234567', {
        sessionId: 'csession123456789012345',
      });

      expect(test.mocks.PrismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ senderId: 'cuser12345678901234567' }, { receiverId: 'cuser12345678901234567' }],
          sessionId: 'csession123456789012345',
        },
        include: expect.any(Object),
        orderBy: { sentAt: 'desc' },
      });
    });

    it('should filter messages by conversationWith', async () => {
      test.mocks.PrismaService.message.findMany.mockResolvedValue([]);

      await test.service.findAll('cuser12345678901234567', {
        conversationWith: 'cotheruser12345678901',
      });

      expect(test.mocks.PrismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { senderId: 'cuser12345678901234567', receiverId: 'cotheruser12345678901' },
            { senderId: 'cotheruser12345678901', receiverId: 'cuser12345678901234567' },
          ],
        },
        include: expect.any(Object),
        orderBy: { sentAt: 'desc' },
      });
    });

    it('should return empty array when no messages found', async () => {
      test.mocks.PrismaService.message.findMany.mockResolvedValue([]);

      const result = await test.service.findAll('cuser12345678901234567', {});

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return message when user is sender', async () => {
      const mockMessage = test.factory.message.createWithNulls({
        id: 'cmessage12345678901234',
        senderId: 'cuser12345678901234567',
        receiverId: 'cotheruser12345678901',
      });
      test.mocks.PrismaService.message.findFirst.mockResolvedValue(mockMessage);

      const result = await test.service.findOne('cmessage12345678901234', 'cuser12345678901234567');

      expect(result.id).toBe('cmessage12345678901234');
    });

    it('should return message when user is receiver', async () => {
      const mockMessage = test.factory.message.createWithNulls({
        id: 'cmessage12345678901234',
        senderId: 'cotheruser12345678901',
        receiverId: 'cuser12345678901234567',
      });
      test.mocks.PrismaService.message.findFirst.mockResolvedValue(mockMessage);

      const result = await test.service.findOne('cmessage12345678901234', 'cuser12345678901234567');

      expect(result.id).toBe('cmessage12345678901234');
    });

    it('should throw NotFoundException when message not found', async () => {
      test.mocks.PrismaService.message.findFirst.mockResolvedValue(null);

      await expect(
        test.service.findOne('cnonexistent12345678901', 'cuser12345678901234567')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user not authorized', async () => {
      const mockMessage = test.factory.message.createWithNulls({
        id: 'cmessage12345678901234',
        senderId: 'cothersender123456789',
        receiverId: 'cotherreceiver12345678',
      });
      test.mocks.PrismaService.message.findFirst.mockResolvedValue(mockMessage);

      await expect(
        test.service.findOne('cmessage12345678901234', 'cuser12345678901234567')
      ).rejects.toThrow(ForbiddenException);
      await expect(
        test.service.findOne('cmessage12345678901234', 'cuser12345678901234567')
      ).rejects.toThrow('Not authorized to view this message');
    });
  });

  describe('findConversation', () => {
    it('should return conversation between two users', async () => {
      const mockMessages = test.factory.message.createConversation(
        'cuser12345678901234567',
        'cotheruser12345678901',
        4
      );
      test.mocks.PrismaService.message.findMany.mockResolvedValue(mockMessages);

      const result = await test.service.findConversation(
        'cuser12345678901234567',
        'cotheruser12345678901'
      );

      expect(result).toHaveLength(4);
      expect(test.mocks.PrismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { senderId: 'cuser12345678901234567', receiverId: 'cotheruser12345678901' },
            { senderId: 'cotheruser12345678901', receiverId: 'cuser12345678901234567' },
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

      const result = await test.service.findConversation(
        'cuser12345678901234567',
        'cotheruser12345678901'
      );

      expect(result).toEqual([]);
    });
  });

  describe('findBySession', () => {
    const userId = 'cuser12345678901234567';
    const coachId = 'ccoach1234567890123456';
    const sessionId = 'csession123456789012345';

    it('should return messages for session when user is authorized', async () => {
      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        coachId,
      });
      const mockMessages = [test.factory.message.createWithNulls({ sessionId })];

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
      test.mocks.PrismaService.message.findMany.mockResolvedValue(mockMessages);

      const result = await test.service.findBySession(sessionId, userId, Role.USER, {});

      expect(result).toHaveLength(1);
      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(sessionId, userId, Role.USER);
    });

    it('should allow coach to view session messages', async () => {
      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        coachId,
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
      test.mocks.PrismaService.message.findMany.mockResolvedValue([]);

      await test.service.findBySession(sessionId, coachId, Role.COACH, {});

      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(
        sessionId,
        coachId,
        Role.COACH
      );
      expect(test.mocks.PrismaService.message.findMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException when session not found', async () => {
      test.mocks.SessionsService.findOne.mockResolvedValue(null);

      await expect(
        test.service.findBySession('cnonexistent12345678901', userId, Role.USER, {})
      ).rejects.toThrow(NotFoundException);
      expect(test.mocks.PrismaService.message.findMany).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user not authorized for session', async () => {
      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId: 'cotheruser12345678901',
        coachId: 'cothercoach1234567890',
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      await expect(test.service.findBySession(sessionId, userId, Role.USER, {})).rejects.toThrow(
        ForbiddenException
      );
      expect(test.mocks.PrismaService.message.findMany).not.toHaveBeenCalled();
    });
  });
});
