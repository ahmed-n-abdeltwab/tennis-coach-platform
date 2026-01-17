import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ServiceTest } from '@test-utils';

import { MessagesService } from '../messages/messages.service';
import { PrismaService } from '../prisma/prisma.service';

import { ConversationsService } from './conversations.service';

interface ConversationMocks {
  PrismaService: {
    conversation: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  MessagesService: {
    getUnreadCountByRecipient: jest.Mock;
    getMessagesByRecipient: jest.Mock;
    markAllAsReadByRecipient: jest.Mock;
  };
}

describe('ConversationsService', () => {
  let test: ServiceTest<ConversationsService, ConversationMocks>;

  beforeEach(async () => {
    test = new ServiceTest({
      service: ConversationsService,
      providers: [
        {
          provide: PrismaService,
          useValue: {
            conversation: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: MessagesService,
          useValue: {
            getUnreadCountByRecipient: jest.fn(),
            getMessagesByRecipient: jest.fn(),
            markAllAsReadByRecipient: jest.fn(),
          },
        },
      ],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('findAll', () => {
    const userId = 'cuser12345678901234567';

    it('should return all conversations for a user', async () => {
      const mockConversations = [
        test.factory.conversation.create({ participantIds: [userId, 'ccoach1234567890123456'] }),
        test.factory.conversation.create({ participantIds: [userId, 'ccoach2345678901234567'] }),
      ];
      test.mocks.PrismaService.conversation.findMany.mockResolvedValue(mockConversations);
      test.mocks.MessagesService.getUnreadCountByRecipient.mockResolvedValue(0);

      const result = await test.service.findAll({}, userId, Role.USER);

      expect(result).toHaveLength(2);
      expect(test.mocks.PrismaService.conversation.findMany).toHaveBeenCalledWith({
        where: { participantIds: { has: userId } },
        include: expect.any(Object),
        orderBy: [{ isPinned: 'desc' }, { pinnedAt: 'desc' }, { lastMessageAt: 'desc' }],
      });
    });

    it('should filter by isPinned when provided', async () => {
      test.mocks.PrismaService.conversation.findMany.mockResolvedValue([]);
      test.mocks.MessagesService.getUnreadCountByRecipient.mockResolvedValue(0);

      await test.service.findAll({ isPinned: true }, userId, Role.USER);

      expect(test.mocks.PrismaService.conversation.findMany).toHaveBeenCalledWith({
        where: { participantIds: { has: userId }, isPinned: true },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should return empty array when no conversations found', async () => {
      test.mocks.PrismaService.conversation.findMany.mockResolvedValue([]);

      const result = await test.service.findAll({}, userId, Role.USER);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    const userId = 'cuser12345678901234567';
    const conversationId = 'cconversation123456789';

    it('should return a conversation when user is a participant', async () => {
      const mockConversation = test.factory.conversation.create({
        id: conversationId,
        participantIds: [userId, 'ccoach1234567890123456'],
      });
      test.mocks.PrismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      test.mocks.MessagesService.getUnreadCountByRecipient.mockResolvedValue(2);

      const result = await test.service.findOne(conversationId, userId, Role.USER);

      expect(result.id).toBe(conversationId);
      expect(test.mocks.MessagesService.getUnreadCountByRecipient).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when conversation not found', async () => {
      test.mocks.PrismaService.conversation.findFirst.mockResolvedValue(null);

      await expect(test.service.findOne(conversationId, userId, Role.USER)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user is not a participant', async () => {
      const mockConversation = test.factory.conversation.create({
        id: conversationId,
        participantIds: ['cotheruser12345678901', 'ccoach1234567890123456'],
      });
      test.mocks.PrismaService.conversation.findFirst.mockResolvedValue(mockConversation);

      await expect(test.service.findOne(conversationId, userId, Role.USER)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should allow ADMIN to access any conversation', async () => {
      const mockConversation = test.factory.conversation.create({
        id: conversationId,
        participantIds: ['cotheruser12345678901', 'ccoach1234567890123456'],
      });
      test.mocks.PrismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      test.mocks.MessagesService.getUnreadCountByRecipient.mockResolvedValue(0);

      const result = await test.service.findOne(conversationId, userId, Role.ADMIN);

      expect(result.id).toBe(conversationId);
    });
  });

  describe('pin', () => {
    const userId = 'ccoach1234567890123456';
    const conversationId = 'cconversation123456789';

    it('should pin a conversation for a coach', async () => {
      const mockConversation = test.factory.conversation.create({
        id: conversationId,
        participantIds: [userId, 'cuser12345678901234567'],
      });
      const pinnedConversation = test.factory.conversation.createPinned(userId, {
        id: conversationId,
        participantIds: [userId, 'cuser12345678901234567'],
      });
      test.mocks.PrismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      test.mocks.PrismaService.conversation.update.mockResolvedValue(pinnedConversation);

      const result = await test.service.pin(conversationId, userId, Role.COACH);

      expect(result.isPinned).toBe(true);
      expect(test.mocks.PrismaService.conversation.update).toHaveBeenCalledWith({
        where: { id: conversationId },
        data: {
          isPinned: true,
          pinnedAt: expect.any(Date),
          pinnedBy: userId,
        },
        include: expect.any(Object),
      });
    });

    it('should throw ForbiddenException when user is not a participant', async () => {
      const mockConversation = test.factory.conversation.create({
        id: conversationId,
        participantIds: ['cothercoach1234567890', 'cuser12345678901234567'],
      });
      test.mocks.PrismaService.conversation.findFirst.mockResolvedValue(mockConversation);

      await expect(test.service.pin(conversationId, userId, Role.COACH)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException when USER tries to pin', async () => {
      const mockConversation = test.factory.conversation.create({
        id: conversationId,
        participantIds: ['cuser12345678901234567', 'ccoach1234567890123456'],
      });
      test.mocks.PrismaService.conversation.findFirst.mockResolvedValue(mockConversation);

      await expect(
        test.service.pin(conversationId, 'cuser12345678901234567', Role.USER)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('unpin', () => {
    const userId = 'ccoach1234567890123456';
    const conversationId = 'cconversation123456789';

    it('should unpin a conversation for a coach', async () => {
      const pinnedConversation = test.factory.conversation.createPinned(userId, {
        id: conversationId,
        participantIds: [userId, 'cuser12345678901234567'],
      });
      const unpinnedConversation = test.factory.conversation.create({
        id: conversationId,
        participantIds: [userId, 'cuser12345678901234567'],
        isPinned: false,
        pinnedAt: null,
        pinnedBy: null,
      });
      test.mocks.PrismaService.conversation.findFirst.mockResolvedValue(pinnedConversation);
      test.mocks.PrismaService.conversation.update.mockResolvedValue(unpinnedConversation);

      const result = await test.service.unpin(conversationId, userId, Role.COACH);

      expect(result.isPinned).toBe(false);
      expect(test.mocks.PrismaService.conversation.update).toHaveBeenCalledWith({
        where: { id: conversationId },
        data: {
          isPinned: false,
          pinnedAt: null,
          pinnedBy: null,
        },
        include: expect.any(Object),
      });
    });

    it('should throw ForbiddenException when USER tries to unpin', async () => {
      const mockConversation = test.factory.conversation.create({
        id: conversationId,
        participantIds: ['cuser12345678901234567', 'ccoach1234567890123456'],
      });
      test.mocks.PrismaService.conversation.findFirst.mockResolvedValue(mockConversation);

      await expect(
        test.service.unpin(conversationId, 'cuser12345678901234567', Role.USER)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMessages', () => {
    const userId = 'cuser12345678901234567';
    const conversationId = 'cconversation123456789';

    it('should return messages for a conversation', async () => {
      const mockConversation = test.factory.conversation.create({
        id: conversationId,
        participantIds: [userId, 'ccoach1234567890123456'],
      });
      const mockMessages = [
        test.factory.message.create({ senderId: userId }),
        test.factory.message.create({ receiverId: userId }),
      ];
      test.mocks.PrismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      test.mocks.MessagesService.getMessagesByRecipient.mockResolvedValue(mockMessages);

      const result = await test.service.getMessages(conversationId, userId, Role.USER);

      expect(result).toHaveLength(2);
      expect(test.mocks.MessagesService.getMessagesByRecipient).toHaveBeenCalledWith(userId, 1, 50);
    });

    it('should throw ForbiddenException when user is not a participant', async () => {
      const mockConversation = test.factory.conversation.create({
        id: conversationId,
        participantIds: ['cotheruser12345678901', 'ccoach1234567890123456'],
      });
      test.mocks.PrismaService.conversation.findFirst.mockResolvedValue(mockConversation);

      await expect(test.service.getMessages(conversationId, userId, Role.USER)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('markMessagesAsRead', () => {
    const userId = 'cuser12345678901234567';
    const conversationId = 'cconversation123456789';

    it('should mark messages as read', async () => {
      const mockConversation = test.factory.conversation.create({
        id: conversationId,
        participantIds: [userId, 'ccoach1234567890123456'],
      });
      test.mocks.PrismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      test.mocks.MessagesService.markAllAsReadByRecipient.mockResolvedValue(5);

      const result = await test.service.markMessagesAsRead(conversationId, userId, Role.USER);

      expect(result.updatedCount).toBe(5);
      expect(test.mocks.MessagesService.markAllAsReadByRecipient).toHaveBeenCalledWith(userId);
    });

    it('should throw ForbiddenException when user is not a participant', async () => {
      const mockConversation = test.factory.conversation.create({
        id: conversationId,
        participantIds: ['cotheruser12345678901', 'ccoach1234567890123456'],
      });
      test.mocks.PrismaService.conversation.findFirst.mockResolvedValue(mockConversation);

      await expect(
        test.service.markMessagesAsRead(conversationId, userId, Role.USER)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOrCreateByParticipants', () => {
    const participantIds = ['ccoach1234567890123456', 'cuser12345678901234567'];

    it('should return existing conversation', async () => {
      const mockConversation = test.factory.conversation.create({ participantIds });
      test.mocks.PrismaService.conversation.findFirst.mockResolvedValue(mockConversation);

      const result = await test.service.findOrCreateByParticipants(participantIds);

      expect(result.participantIds).toEqual(participantIds);
      expect(test.mocks.PrismaService.conversation.create).not.toHaveBeenCalled();
    });

    it('should create new conversation when none exists', async () => {
      const mockConversation = test.factory.conversation.create({ participantIds });
      test.mocks.PrismaService.conversation.findFirst.mockResolvedValue(null);
      test.mocks.PrismaService.conversation.create.mockResolvedValue(mockConversation);

      const result = await test.service.findOrCreateByParticipants(participantIds);

      expect(result.participantIds).toEqual(participantIds);
      expect(test.mocks.PrismaService.conversation.create).toHaveBeenCalledWith({
        data: { participantIds },
      });
    });
  });

  describe('updateLastMessage', () => {
    it('should update last message reference', async () => {
      const conversationId = 'cconversation123456789';
      const messageId = 'cmessage12345678901234';
      const sentAt = new Date();

      await test.service.updateLastMessage(conversationId, messageId, sentAt);

      expect(test.mocks.PrismaService.conversation.update).toHaveBeenCalledWith({
        where: { id: conversationId },
        data: {
          lastMessageId: messageId,
          lastMessageAt: sentAt,
        },
      });
    });
  });

  describe('existsWithParticipant', () => {
    const conversationId = 'cconversation123456789';
    const userId = 'cuser12345678901234567';

    it('should return true when user is a participant', async () => {
      test.mocks.PrismaService.conversation.findUnique.mockResolvedValue({
        participantIds: [userId, 'ccoach1234567890123456'],
      });

      const result = await test.service.existsWithParticipant(conversationId, userId);

      expect(result).toBe(true);
    });

    it('should return false when user is not a participant', async () => {
      test.mocks.PrismaService.conversation.findUnique.mockResolvedValue({
        participantIds: ['cotheruser12345678901', 'ccoach1234567890123456'],
      });

      const result = await test.service.existsWithParticipant(conversationId, userId);

      expect(result).toBe(false);
    });

    it('should return false when conversation does not exist', async () => {
      test.mocks.PrismaService.conversation.findUnique.mockResolvedValue(null);

      const result = await test.service.existsWithParticipant(conversationId, userId);

      expect(result).toBe(false);
    });
  });
});
