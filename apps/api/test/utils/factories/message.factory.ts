/**
 * Message mock factory for creating test message data
 */

import { Role } from '@prisma/client';

import { BaseMockFactory } from './base-factory';

export interface MockMessage {
  id: string;
  content: string;
  sentAt: Date;
  senderId?: string;
  receiverId?: string;
  sessionId?: string;
  senderType: Role;
  receiverType: Role;
}

export class MessageMockFactory extends BaseMockFactory<MockMessage> {
  create(overrides?: Partial<MockMessage>): MockMessage {
    const id = this.generateId();

    const message = {
      id,
      content: this.randomContent(),
      sentAt: new Date(),
      senderType: Role.USER,
      senderId: this.generateId(),
      receiverType: Role.COACH,
      receiverId: this.generateId(),
      ...overrides,
    };

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

  createConversation(userId: string, coachId: string, messageCount: number): MockMessage[] {
    const messages: MockMessage[] = [];

    for (let i = 0; i < messageCount; i++) {
      const isUserSender = i % 2 === 0;
      const sentAt = new Date(Date.now() - (messageCount - i) * 60000); // 1 minute apart

      if (isUserSender) {
        messages.push(this.createUserToCoach(userId, coachId, { sentAt }));
      } else {
        messages.push(this.createCoachToUser(coachId, userId, { sentAt }));
      }
    }

    return messages;
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
