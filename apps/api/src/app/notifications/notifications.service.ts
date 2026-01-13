/**
 * Notifications Service
 *
 * Handles various types of notifications including:
 * - Custom service notifications
 * - Booking reminders and confirmations
 * - System notifications for role changes
 * - Email integration for important notifications
 *
 * Requirements: 4.7, 1.5
 */

import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  Notification,
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  Prisma,
  Role,
} from '@prisma/client';

import { AccountsService } from '../accounts/accounts.service';
import { AppLoggerService } from '../logger';
import { MessagesGateway } from '../messages/messages.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';

import { SendEmailDto } from './dto/notification.dto';
import { MailerService, MailResult } from './mailer';

/**
 * Interface for creating notifications
 */
export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  metadata?: Prisma.InputJsonValue;
  scheduledFor?: Date;
}

/**
 * Interface for notification data response
 */
export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string;
  senderId: string | null;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  readAt: Date | null;
  scheduledFor: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private accountsService: AccountsService,
    private messagesGateway: MessagesGateway,
    private mailerService: MailerService,
    @Inject(forwardRef(() => SessionsService))
    private sessionsService: SessionsService,
    private readonly logger: AppLoggerService
  ) {
    this.logger.setContext(NotificationsService.name);
  }

  /**
   * Create and send a notification
   */
  async createNotification(data: CreateNotificationInput): Promise<NotificationData> {
    const {
      type,
      title,
      message,
      recipientId,
      priority = NotificationPriority.MEDIUM,
      channels = [NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET],
      metadata = {},
      scheduledFor,
    } = data;

    // Verify recipient exists
    const recipient = await this.accountsService.existsById(recipientId);
    if (!recipient) {
      throw new Error(`Recipient with ID ${recipientId} not found`);
    }

    // Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        type,
        title,
        message,
        recipientId,
        priority,
        channels,
        metadata,
        scheduledFor,
        isRead: false,
      },
    });

    // Send notification immediately if not scheduled
    if (!scheduledFor || scheduledFor <= new Date()) {
      await this.sendNotification(notification);
    }

    return this.mapToNotificationData(notification);
  }

  /**
   * Send email notification
   * Used by POST /api/notifications/email endpoint
   */
  async sendEmail(emailDto: SendEmailDto, userId: string, role: Role): Promise<MailResult> {
    this.logger.log(`User ${userId} (${role}) sending email to ${emailDto.to}`);

    const result = await this.mailerService.sendMail({
      to: emailDto.to,
      subject: emailDto.subject,
      text: emailDto.text,
      html: emailDto.html,
    });

    if (result.success) {
      this.logger.log(`Email sent successfully to ${emailDto.to}`);
    } else {
      this.logger.warn(`Email sending failed to ${emailDto.to}: ${result.errors?.join(', ')}`);
    }

    return result;
  }

  /**
   * Send booking confirmation email
   * Used by POST /api/notifications/confirm endpoint
   */
  async sendBookingConfirmation(sessionId: string, userId: string, role: Role): Promise<void> {
    // Verify user has access to this session
    const session = await this.sessionsService.findOne(sessionId, userId, role);

    if (!session) {
      throw new UnauthorizedException('you must create session first');
    }

    // Get user email from session
    const userEmail = session.user?.email;
    if (!userEmail) {
      throw new Error('User email not found for session');
    }

    // Build confirmation email
    const sessionDate = new Date(session.dateTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = `
      <h1>Booking Confirmation - Tennis Coaching Session</h1>
      <p>Dear ${session.user?.name ?? 'Customer'},</p>
      <p>Your booking has been confirmed!</p>
      <h2>Session Details</h2>
      <ul>
        <li><strong>Coach:</strong> ${session.coach?.name ?? 'N/A'}</li>
        <li><strong>Service:</strong> ${session.bookingType?.name ?? 'N/A'}</li>
        <li><strong>Date & Time:</strong> ${sessionDate}</li>
        <li><strong>Duration:</strong> ${session.durationMin} minutes</li>
        <li><strong>Price:</strong> $${session.price}</li>
      </ul>
      <p>Thank you for booking with us!</p>
    `;

    await this.mailerService.sendMail({
      to: userEmail,
      subject: 'Booking Confirmation - Tennis Coaching Session',
      html,
      text: `Booking Confirmation - Your session with ${session.coach?.name ?? 'your coach'} on ${sessionDate} has been confirmed.`,
    });

    this.logger.log(`Booking confirmation sent for session ${sessionId} to ${userEmail}`);
  }

  /**
   * Send custom service notification
   */
  async sendCustomServiceNotification(
    serviceId: string,
    serviceName: string,
    fromUserId: string,
    toUserId: string,
    message?: string
  ): Promise<void> {
    try {
      const fromUser = await this.accountsService.existsById(fromUserId);
      if (!fromUser) {
        throw new Error(`Sender with ID ${fromUserId} not found`);
      }

      const notification = await this.createNotification({
        type: NotificationType.CUSTOM_SERVICE,
        title: 'Custom Service Shared',
        message: message ?? `${fromUser.name} shared a custom service with you: ${serviceName}`,
        recipientId: toUserId,
        priority: NotificationPriority.MEDIUM,
        channels: [
          NotificationChannel.IN_APP,
          NotificationChannel.WEBSOCKET,
          NotificationChannel.EMAIL,
        ],
        metadata: {
          serviceId,
          serviceName,
          fromUserId,
          fromUserName: fromUser.name,
        },
      });

      // Send real-time notification through WebSocket
      await this.messagesGateway.sendCustomServiceNotification(
        serviceId,
        serviceName,
        fromUserId,
        fromUser.name,
        toUserId,
        message
      );

      this.logger.log(`Custom service notification sent: ${notification.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send custom service notification: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Send booking reminder notification
   */
  async sendBookingReminder(
    sessionId: string,
    userId: string,
    coachId: string,
    sessionDateTime: Date
  ): Promise<void> {
    try {
      const [user, coach] = await Promise.all([
        this.accountsService.existsById(userId),
        this.accountsService.existsById(coachId),
      ]);

      if (!user || !coach) {
        throw new Error('User or coach not found for booking reminder');
      }

      const timeUntilSession = sessionDateTime.getTime() - new Date().getTime();
      const hoursUntilSession = Math.round(timeUntilSession / (1000 * 60 * 60));

      // Send reminder to user
      await this.createNotification({
        type: NotificationType.BOOKING_REMINDER,
        title: 'Upcoming Session Reminder',
        message: `Your session with ${coach.name} is in ${hoursUntilSession} hours`,
        recipientId: userId,
        priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        metadata: {
          sessionId,
          coachId,
          sessionDateTime: sessionDateTime.toISOString(),
        },
      });

      // Send reminder to coach
      await this.createNotification({
        type: NotificationType.BOOKING_REMINDER,
        title: 'Upcoming Session Reminder',
        message: `Your session with ${user.name} is in ${hoursUntilSession} hours`,
        recipientId: coachId,
        priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        metadata: {
          sessionId,
          userId,
          sessionDateTime: sessionDateTime.toISOString(),
        },
      });

      this.logger.log(`Booking reminders sent for session: ${sessionId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send booking reminder: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Send booking confirmation notification (internal use - called by SessionsService)
   * Creates in-app notifications for both user and coach
   */
  async sendBookingConfirmationNotification(
    sessionId: string,
    userId: string,
    coachId: string,
    sessionDateTime: Date
  ): Promise<void> {
    try {
      const [user, coach] = await Promise.all([
        this.accountsService.existsById(userId),
        this.accountsService.existsById(coachId),
      ]);

      if (!user || !coach) {
        throw new Error('User or coach not found for booking confirmation');
      }

      // Send confirmation to user
      await this.createNotification({
        type: NotificationType.BOOKING_CONFIRMATION,
        title: 'Booking Confirmed',
        message: `Your session with ${coach.name} has been confirmed for ${sessionDateTime.toLocaleDateString()}`,
        recipientId: userId,
        priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        metadata: {
          sessionId,
          coachId,
          sessionDateTime: sessionDateTime.toISOString(),
        },
      });

      // Send notification to coach
      await this.createNotification({
        type: NotificationType.BOOKING_CONFIRMATION,
        title: 'New Booking Received',
        message: `${user.name} has booked a session with you for ${sessionDateTime.toLocaleDateString()}`,
        recipientId: coachId,
        priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        metadata: {
          sessionId,
          userId,
          sessionDateTime: sessionDateTime.toISOString(),
        },
      });

      this.logger.log(`Booking confirmations sent for session: ${sessionId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send booking confirmation: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Send role change notification
   */
  async sendRoleChangeNotification(
    userId: string,
    oldRole: Role,
    newRole: Role,
    changedByUserId: string
  ): Promise<void> {
    try {
      const [user, changedByUser] = await Promise.all([
        this.accountsService.existsById(userId),
        this.accountsService.existsById(changedByUserId),
      ]);

      if (!user || !changedByUser) {
        throw new Error('User not found for role change notification');
      }

      await this.createNotification({
        type: NotificationType.ROLE_CHANGE,
        title: 'Account Role Updated',
        message: `Your account role has been changed from ${oldRole} to ${newRole} by ${changedByUser.name}`,
        recipientId: userId,
        priority: NotificationPriority.HIGH,
        channels: [
          NotificationChannel.IN_APP,
          NotificationChannel.EMAIL,
          NotificationChannel.WEBSOCKET,
        ],
        metadata: {
          oldRole,
          newRole,
          changedByUserId,
          changedByUserName: changedByUser.name,
        },
      });

      this.logger.log(`Role change notification sent to user: ${userId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send role change notification: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Send system announcement
   */
  async sendSystemAnnouncement(
    title: string,
    message: string,
    targetRoles?: Role[],
    priority: NotificationPriority = NotificationPriority.MEDIUM
  ): Promise<void> {
    try {
      // Get all users or users with specific roles
      const users = await this.accountsService.getAccounts();
      const targetUsers = targetRoles
        ? users.filter(user => targetRoles.includes(user.role))
        : users;

      // Send notification to all target users
      const notifications = await Promise.all(
        targetUsers.map(user =>
          this.createNotification({
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            title,
            message,
            recipientId: user.id,
            priority,
            channels: [NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET],
            metadata: {
              targetRoles: targetRoles ?? ['ALL'],
            },
          })
        )
      );

      this.logger.log(`System announcement sent to ${notifications.length} users`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send system announcement: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    } = {}
  ): Promise<{ notifications: NotificationData[]; total: number }> {
    const { limit = 50, offset = 0, unreadOnly = false, type } = options;

    const where: Prisma.NotificationWhereInput = { recipientId: userId };
    if (unreadOnly) {
      where.isRead = false;
    }
    if (type) {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map(n => this.mapToNotificationData(n)),
      total,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<NotificationData> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    const updatedNotification = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return this.mapToNotificationData(updatedNotification);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });
  }

  /**
   * Send notification through appropriate channels
   */
  private async sendNotification(notification: Notification): Promise<void> {
    const channels = notification.channels;

    // Send through WebSocket if enabled
    if (channels.includes(NotificationChannel.WEBSOCKET)) {
      // This would be handled by the WebSocket gateway
      // For now, we'll just log it
      this.logger.log(`WebSocket notification sent: ${notification.id}`);
    }

    // Send through email if enabled
    if (channels.includes(NotificationChannel.EMAIL)) {
      await this.sendEmailNotification(notification);
    }

    // Update sent timestamp
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: { sentAt: new Date() },
    });
  }

  /**
   * Send email notification (placeholder implementation)
   */
  private async sendEmailNotification(notification: Notification): Promise<void> {
    // This would integrate with an email service like SendGrid, AWS SES, etc.
    // For now, we'll just log the email that would be sent
    this.logger.log(
      `Email notification would be sent: ${notification.title} to ${notification.recipientId}`
    );

    // In a real implementation, you would:
    // 1. Get recipient email from AccountsService
    // 2. Format email template based on notification type
    // 3. Send email through email service
    // 4. Handle delivery status and retries
  }

  /**
   * Map database notification to NotificationData interface
   */
  private mapToNotificationData(notification: Notification): NotificationData {
    // Convert Prisma JsonValue to Record<string, unknown> | null
    const metadata =
      notification.metadata !== null && typeof notification.metadata === 'object'
        ? (notification.metadata as Record<string, unknown>)
        : null;

    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      recipientId: notification.recipientId,
      senderId: notification.senderId,
      priority: notification.priority,
      channels: notification.channels,
      metadata,
      isRead: notification.isRead,
      readAt: notification.readAt,
      scheduledFor: notification.scheduledFor,
      sentAt: notification.sentAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }
}
