/**
 * Notification mock factory for creating test Prisma Notification data
 * This factory matches the Prisma Notification model schema.
 * For email sending mocks (Nodemailer), use EmailMockFactory.
 */

import { DeepPartial } from '@api-sdk/testing';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  Prisma,
} from '@prisma/client';

import { AccountMockFactory, type MockAccount } from './account.factory';
import { BaseMockFactory } from './base-factory';

export interface MockNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string;
  senderId: string | null;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  metadata: Prisma.JsonValue;
  isRead: boolean;
  readAt: Date | null;
  scheduledFor: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Optional relations
  recipient?: Pick<MockAccount, 'id' | 'email' | 'name'>;
  sender?: Pick<MockAccount, 'id' | 'email' | 'name'> | null;
}

export class NotificationMockFactory extends BaseMockFactory<MockNotification> {
  private _account?: AccountMockFactory;

  private get account(): AccountMockFactory {
    return (this._account ??= new AccountMockFactory());
  }

  protected generateMock(overrides?: DeepPartial<MockNotification>): MockNotification {
    const id = this.generateId();
    const now = this.createDate();

    // Resolve recipient
    const rawRecipient = overrides?.recipient ?? this.account.createUser();
    const recipient = {
      id: overrides?.recipientId ?? rawRecipient.id,
      email: rawRecipient.email,
      name: rawRecipient.name,
    };

    // Resolve sender (optional)
    const rawSender = overrides?.sender === null ? null : (overrides?.sender ?? null);
    const sender = rawSender
      ? {
          id: overrides?.senderId ?? rawSender.id,
          email: rawSender.email,
          name: rawSender.name,
        }
      : null;

    const notification = {
      id,
      type: this.randomNotificationType(),
      title: this.randomTitle(),
      message: this.randomMessage(),
      recipientId: recipient.id,
      senderId: sender?.id ?? null,
      priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET],
      metadata: {},
      isRead: false,
      readAt: null,
      scheduledFor: null,
      sentAt: null,
      createdAt: now,
      updatedAt: now,
      recipient,
      sender,
      ...overrides,
    } as MockNotification;

    // Validate required fields
    this.validateRequired(notification.recipientId, 'recipientId');
    this.validateRequired(notification.type, 'type');
    this.validateRequired(notification.title, 'title');
    this.validateRequired(notification.message, 'message');

    return notification;
  }

  private randomNotificationType(): NotificationType {
    const types = [
      NotificationType.CUSTOM_SERVICE,
      NotificationType.BOOKING_REMINDER,
      NotificationType.BOOKING_CONFIRMATION,
      NotificationType.ROLE_CHANGE,
      NotificationType.SYSTEM_ANNOUNCEMENT,
      NotificationType.MESSAGE_RECEIVED,
    ];
    return types[Math.floor(Math.random() * types.length)] ?? NotificationType.SYSTEM_ANNOUNCEMENT;
  }

  private randomTitle(): string {
    const titles = [
      'New Booking Confirmed',
      'Session Reminder',
      'Custom Service Shared',
      'Role Updated',
      'System Announcement',
      'New Message Received',
    ];
    return titles[Math.floor(Math.random() * titles.length)] ?? 'Notification';
  }

  private randomMessage(): string {
    const messages = [
      'Your booking has been confirmed.',
      'Your session starts in 1 hour.',
      'A coach shared a custom service with you.',
      'Your account role has been updated.',
      'Important system update.',
      'You have a new message.',
    ];
    return messages[Math.floor(Math.random() * messages.length)] ?? 'You have a new notification.';
  }

  /**
   * Create a custom service notification
   */
  createCustomServiceNotification(
    recipientId: string,
    senderId: string,
    serviceName: string,
    overrides?: DeepPartial<MockNotification>
  ): MockNotification {
    return this.create({
      type: NotificationType.CUSTOM_SERVICE,
      title: 'Custom Service Shared',
      message: `A coach shared a custom service with you: ${serviceName}`,
      recipientId,
      senderId,
      priority: NotificationPriority.MEDIUM,
      channels: [
        NotificationChannel.IN_APP,
        NotificationChannel.WEBSOCKET,
        NotificationChannel.EMAIL,
      ],
      metadata: { serviceName },
      ...overrides,
    });
  }

  /**
   * Create a booking reminder notification
   */
  createBookingReminder(
    recipientId: string,
    sessionId: string,
    hoursUntil: number,
    overrides?: DeepPartial<MockNotification>
  ): MockNotification {
    return this.create({
      type: NotificationType.BOOKING_REMINDER,
      title: 'Upcoming Session Reminder',
      message: `Your session is in ${hoursUntil} hours`,
      recipientId,
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      metadata: { sessionId, hoursUntil },
      ...overrides,
    });
  }

  /**
   * Create a booking confirmation notification
   */
  createBookingConfirmation(
    recipientId: string,
    sessionId: string,
    sessionDate: Date,
    overrides?: DeepPartial<MockNotification>
  ): MockNotification {
    return this.create({
      type: NotificationType.BOOKING_CONFIRMATION,
      title: 'Booking Confirmed',
      message: `Your session has been confirmed for ${sessionDate.toLocaleDateString()}`,
      recipientId,
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      metadata: { sessionId, sessionDateTime: sessionDate.toISOString() },
      ...overrides,
    });
  }

  /**
   * Create a role change notification
   */
  createRoleChangeNotification(
    recipientId: string,
    oldRole: string,
    newRole: string,
    changedByUserId: string,
    overrides?: DeepPartial<MockNotification>
  ): MockNotification {
    return this.create({
      type: NotificationType.ROLE_CHANGE,
      title: 'Account Role Updated',
      message: `Your account role has been changed from ${oldRole} to ${newRole}`,
      recipientId,
      senderId: changedByUserId,
      priority: NotificationPriority.HIGH,
      channels: [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
        NotificationChannel.WEBSOCKET,
      ],
      metadata: { oldRole, newRole, changedByUserId },
      ...overrides,
    });
  }

  /**
   * Create a system announcement notification
   */
  createSystemAnnouncement(
    recipientId: string,
    title: string,
    message: string,
    overrides?: DeepPartial<MockNotification>
  ): MockNotification {
    return this.create({
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title,
      message,
      recipientId,
      priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET],
      ...overrides,
    });
  }

  /**
   * Create a read notification
   */
  createRead(overrides?: DeepPartial<MockNotification>): MockNotification {
    const readAt = this.createDate();
    return this.create({
      isRead: true,
      readAt,
      ...overrides,
    });
  }

  /**
   * Create a sent notification
   */
  createSent(overrides?: DeepPartial<MockNotification>): MockNotification {
    const sentAt = this.createDate();
    return this.create({
      sentAt,
      ...overrides,
    });
  }

  /**
   * Create a scheduled notification
   */
  createScheduled(scheduledFor: Date, overrides?: DeepPartial<MockNotification>): MockNotification {
    return this.create({
      scheduledFor,
      sentAt: null,
      ...overrides,
    });
  }
}
