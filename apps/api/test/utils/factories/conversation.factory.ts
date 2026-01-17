/**
 * Conversation mock factory for creating test conversation data
 */

import { DeepPartial } from '@api-sdk/testing';
import { MessageType } from '@prisma/client';

import { AccountMockFactory } from './account.factory';
import { BaseMockFactory } from './base-factory';

export interface MockLastMessage {
  id: string;
  content: string;
  sentAt: Date;
  senderId: string;
  messageType: MessageType;
}

export interface MockConversation {
  id: string;
  participantIds: string[];
  lastMessageId: string | null;
  lastMessageAt: Date | null;
  isPinned: boolean;
  pinnedAt: Date | null;
  pinnedBy: string | null;
  lastMessage: MockLastMessage | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    messages: number;
  };
}

export class ConversationMockFactory extends BaseMockFactory<MockConversation> {
  private _account?: AccountMockFactory;

  private get account(): AccountMockFactory {
    return (this._account ??= new AccountMockFactory());
  }

  protected generateMock(overrides?: DeepPartial<MockConversation>): MockConversation {
    const id = this.generateId();
    const now = this.createDate();

    // Generate default participants if not provided
    const user = this.account.createUser();
    const coach = this.account.createCoach();
    const defaultParticipantIds = [user.id, coach.id].sort();

    const participantIds = overrides?.participantIds ?? defaultParticipantIds;

    // Generate last message if not explicitly set to null
    const lastMessage =
      overrides?.lastMessage === null
        ? null
        : {
            id: this.generateId(),
            content: this.randomMessageContent(),
            sentAt: now,
            senderId: participantIds[0] ?? user.id,
            messageType: MessageType.TEXT,
            ...overrides?.lastMessage,
          };

    const conversation = {
      id,
      participantIds,
      lastMessageId: lastMessage?.id ?? null,
      lastMessageAt: lastMessage?.sentAt ?? null,
      isPinned: false,
      pinnedAt: null,
      pinnedBy: null,
      lastMessage,
      createdAt: now,
      updatedAt: now,
      _count: {
        messages: 0,
      },
      ...overrides,
    } as MockConversation;

    // Validate required fields
    this.validateRequired(conversation.participantIds, 'participantIds');
    if (conversation.participantIds.length < 2) {
      throw new Error('[Factory] Conversation must have at least 2 participants');
    }

    return conversation;
  }

  private randomMessageContent(): string {
    const contents = [
      'Hello, how can I help you today?',
      'Thanks for reaching out!',
      'Looking forward to our session.',
      'Let me know if you have any questions.',
      'Great progress today!',
    ];
    return contents[Math.floor(Math.random() * contents.length)] ?? 'Hello!';
  }

  /**
   * Create a pinned conversation
   */
  createPinned(pinnedBy: string, overrides?: DeepPartial<MockConversation>): MockConversation {
    return this.create({
      isPinned: true,
      pinnedAt: this.createDate(),
      pinnedBy,
      lastMessageId: null,
      lastMessageAt: null,
      _count: { messages: 0 },
      ...overrides,
    });
  }
}
