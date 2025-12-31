/**
 * Message mock factory for creating test message data
 */

import { Role } from '@prisma/client';

import { DeepPartial } from '../http';

import { AccountMockFactory, MockAccount } from './account.factory';
import { BaseMockFactory } from './base-factory';

export interface MockMessage {
  id: string;
  content: string;
  createdAt: Date;
  sentAt: Date;
  updatedAt: Date;
  senderId: string;
  receiverId: string;
  sessionId?: string;
  senderType: Role;
  receiverType: Role;
  sender?: Pick<MockAccount, 'id' | 'name' | 'email'>;
  receiver?: Pick<MockAccount, 'id' | 'name' | 'email'>;
}

export class MessageMockFactory extends BaseMockFactory<MockMessage> {
  private readonly account: AccountMockFactory;

  constructor() {
    // Initialize mixins
    super();
    this.account = new AccountMockFactory();
  }

  protected generateMock(overrides?: DeepPartial<MockMessage>): MockMessage {
    const id = this.generateId();
    const now = this.createDate();
    // 1. Resolve Coach (Ensuring ID and Object match)
    const rawSender =
      overrides?.sender ?? this.account.create({ role: overrides?.senderType ?? Role.USER });
    const sender = {
      id: overrides?.senderId ?? rawSender.id,
      email: rawSender.email,
      name: rawSender.name,
    };

    // 2. Resolve User (Ensuring ID and Object match)
    const rawReceiver =
      overrides?.receiver ?? this.account.create({ role: overrides?.receiverType ?? Role.COACH });
    const receiver = {
      id: overrides?.receiverId ?? rawReceiver.id,
      email: rawReceiver.email,
      name: rawReceiver.name,
    };
    const message = {
      id,
      content: this.randomContent(),
      createdAt: now,
      sentAt: now,
      updatedAt: now,
      senderType: overrides?.senderType ?? Role.USER,
      senderId: sender.id,
      receiverType: overrides?.receiverType ?? Role.COACH,
      receiverId: receiver.id,
      sender,
      receiver,
      ...overrides,
    } as MockMessage;

    // Validate required fields
    this.validateRequired(message.content, 'content');
    this.validateRequired(message.sentAt, 'sentAt');
    this.validateRequired(message.senderType, 'senderType');
    this.validateRequired(message.receiverType, 'receiverType');

    // Validate that content is not empty
    if (message.content.trim().length === 0) {
      throw new Error('[Factory] Invalid message: content cannot be empty');
    }

    return message;
  }

  createUserToCoach(
    userId: string,
    coachId: string,
    overrides?: Partial<MockMessage>
  ): MockMessage {
    return this.create({
      senderType: Role.USER,
      senderId: userId,
      receiverType: Role.COACH,
      receiverId: coachId,
      ...overrides,
    });
  }

  createCoachToUser(
    coachId: string,
    userId: string,
    overrides?: Partial<MockMessage>
  ): MockMessage {
    return this.create({
      senderType: Role.COACH,
      senderId: coachId,
      receiverType: Role.USER,
      receiverId: userId,
      ...overrides,
    });
  }

  createSessionMessage(sessionId: string, overrides?: Partial<MockMessage>): MockMessage {
    return this.create({
      sessionId,
      content: this.randomSessionContent(),
      ...overrides,
    });
  }

  createConversation(
    userId: string,
    coachId: string,
    messageCount: number,
    conversationType: 'support' | 'booking' | 'feedback' | 'general' = 'general',
    startTime?: Date
  ): MockMessage[] {
    const messages: MockMessage[] = [];
    const baseTime = startTime || new Date(Date.now() - messageCount * 60000);

    for (let i = 0; i < messageCount; i++) {
      const isUserSender = i % 2 === 0;
      const sentAt = this.createDate(new Date(baseTime.getTime() + i * 60000)); // 1 minute apart

      const content = this.getTypedContent(conversationType, isUserSender, i);

      if (isUserSender) {
        messages.push(this.createUserToCoach(userId, coachId, { sentAt, content }));
      } else {
        messages.push(this.createCoachToUser(coachId, userId, { sentAt, content }));
      }
    }

    return messages;
  }

  private getTypedContent(
    type: 'support' | 'booking' | 'feedback' | 'general',
    isUserSender: boolean,
    messageIndex: number
  ): string {
    const contentMap = {
      support: {
        user: [
          'Hi, I have a question about my upcoming lesson.',
          'Is it possible to change the time of our session?',
          'I need help with the booking system.',
          'Can you help me understand the payment process?',
          'I have a technical issue with the app.',
        ],
        coach: [
          "Hello! I'd be happy to help with your question.",
          'Of course, we can reschedule. What time works better for you?',
          'I can guide you through the booking process.',
          'The payment is processed securely through our system.',
          'Let me help you troubleshoot that issue.',
        ],
      },
      booking: {
        user: [
          "Hi, I'd like to book a lesson with you.",
          'What time slots are available this week?',
          'Can we schedule a session for next Tuesday?',
          "I'm interested in group training sessions.",
          'How do I confirm my booking?',
        ],
        coach: [
          "Hello! I'd be glad to schedule a lesson for you.",
          'I have availability on Monday, Wednesday, and Friday.',
          'Tuesday at 2 PM works well. Shall I book that for you?',
          'Group sessions are available on weekends. Would you like to join?',
          "Your booking is confirmed! You'll receive a confirmation email.",
        ],
      },
      feedback: {
        user: [
          'Thank you for the great lesson yesterday!',
          'I really enjoyed working on my backhand technique.',
          'The session was very helpful. I learned a lot.',
          'Your coaching style is excellent.',
          'I can already see improvement in my game.',
        ],
        coach: [
          "You're welcome! It was great working with you.",
          'Your backhand is looking much better already!',
          "I'm glad you found the session helpful.",
          'Thank you! I enjoy teaching motivated students like you.',
          "Keep practicing those drills and you'll see even more improvement.",
        ],
      },
      general: {
        user: [
          'Hello, I have a question about my next session.',
          'Can we reschedule our appointment for tomorrow?',
          'Thank you for the great lesson today!',
          "I'm working on the techniques you showed me.",
          'What should I focus on before our next meeting?',
        ],
        coach: [
          'Hi there! How can I help you today?',
          'Of course, tomorrow works. What time would you prefer?',
          "You're welcome! It was a productive session.",
          "That's great to hear! Keep up the good work.",
          'Focus on your footwork and racket preparation.',
        ],
      },
    };

    const senderType = isUserSender ? 'user' : 'coach';
    const contents = contentMap[type][senderType];
    return contents[messageIndex % contents.length] ?? contents[0] ?? "Shouldn't print this";
  }

  private randomContent(): string {
    const contents = [
      'Hello, I have a question about my next session.',
      'Can we reschedule our appointment for tomorrow?',
      'Thank you for the great lesson today!',
      "I'm working on the techniques you showed me.",
      'What should I focus on before our next meeting?',
      "I've been practicing my serve as you suggested.",
      'Could you recommend some exercises for footwork?',
      'I really appreciate your coaching style.',
    ];
    return contents[Math.floor(Math.random() * contents.length)] ?? 'default content';
  }

  private randomSessionContent(): string {
    const contents = [
      'Looking forward to our session today!',
      'Please bring your racket and water bottle.',
      "We'll focus on your backhand technique today.",
      "Great progress in today's session!",
      'Remember to practice the drills we covered.',
      'Your serve is improving significantly.',
    ];
    return contents[Math.floor(Math.random() * contents.length)] ?? 'default session content';
  }
}
