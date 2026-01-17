import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel, NotificationPriority, NotificationType, Role } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { IsCuid } from '../../../common';

export class SendBookingConfirmationDto {
  @ApiProperty()
  @IsString()
  @IsCuid()
  sessionId: string;
}
export class SendEmailDto {
  @ApiProperty()
  @IsEmail()
  to: string;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  html?: string;
}
export class MailResponse {
  @ApiProperty()
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  errors?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  message_ids?: string[];
}

/**
 * DTO for testing custom service notifications
 */
export class TestCustomServiceNotificationDto {
  @ApiProperty({ description: 'Recipient user ID' })
  @IsString()
  @IsCuid()
  recipientId: string;

  @ApiProperty({ description: 'Name of the custom service' })
  @IsString()
  serviceName: string;

  @ApiPropertyOptional({ description: 'Optional message to include' })
  @IsOptional()
  @IsString()
  message?: string;
}

/**
 * DTO for creating notifications
 */
export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'Recipient user ID' })
  @IsCuid()
  @IsNotEmpty()
  recipientId: string;

  @ApiPropertyOptional({ enum: NotificationPriority, description: 'Notification priority' })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    isArray: true,
    description: 'Delivery channels for the notification',
  })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  channels?: NotificationChannel[];

  @ApiPropertyOptional({ description: 'Additional metadata for the notification' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Schedule notification for future delivery' })
  @Type(() => Date)
  @IsOptional()
  scheduledFor?: Date;
}

/**
 * DTO for querying notifications
 */
export class GetNotificationsQueryDto {
  @ApiPropertyOptional({
    description: 'Number of notifications to return',
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of notifications to skip', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  offset?: number;

  @ApiPropertyOptional({ description: 'Return only unread notifications' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ enum: NotificationType, description: 'Filter by notification type' })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;
}

/**
 * DTO for marking notifications as read
 */
export class MarkNotificationReadDto {
  @ApiPropertyOptional({ description: 'Whether to mark as read (default: true)' })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}

/**
 * DTO for sending system announcements
 */
export class SendAnnouncementDto {
  @ApiProperty({ description: 'Announcement title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Announcement message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    enum: Role,
    isArray: true,
    description: 'Target user roles (if not specified, sends to all users)',
  })
  @IsArray()
  @IsEnum(Role, { each: true })
  @IsOptional()
  targetRoles?: Role[];

  @ApiPropertyOptional({ enum: NotificationPriority, description: 'Announcement priority' })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;
}

/**
 * Response DTO for individual notifications
 */
export class NotificationResponseDto {
  @ApiProperty({ description: 'Notification ID' })
  @IsCuid()
  id: string;

  @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Recipient user ID' })
  @IsString()
  @IsCuid()
  recipientId: string;

  @ApiPropertyOptional({ description: 'Sender user ID', nullable: true })
  @IsString()
  @IsCuid()
  @IsOptional()
  @Transform(({ value }) => (value === null ? undefined : value))
  senderId: string | null;

  @ApiProperty({ enum: NotificationPriority, description: 'Notification priority' })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @ApiProperty({
    enum: NotificationChannel,
    isArray: true,
    description: 'Delivery channels for the notification',
  })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @ApiProperty({ description: 'Additional metadata for the notification', nullable: true })
  @IsObject()
  @IsOptional()
  @Transform(({ value }) => (value === null ? undefined : value))
  metadata: Record<string, unknown> | null;

  @ApiProperty({ description: 'Whether the notification has been read' })
  @IsBoolean()
  isRead: boolean;

  @ApiPropertyOptional({ description: 'When the notification was read', nullable: true })
  @IsOptional()
  readAt: Date | null;

  @ApiPropertyOptional({ description: 'When the notification was scheduled for', nullable: true })
  scheduledFor: Date | null;

  @ApiPropertyOptional({ description: 'When the notification was sent', nullable: true })
  sentAt: Date | null;

  @ApiProperty({ description: 'When the notification was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the notification was last updated' })
  updatedAt: Date;
}

/**
 * Response DTO for notification lists
 */
export class NotificationsListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto], description: 'List of notifications' })
  notifications: NotificationResponseDto[];

  @ApiProperty({ description: 'Total number of notifications' })
  total: number;

  @ApiProperty({ description: 'Number of notifications returned' })
  limit: number;

  @ApiProperty({ description: 'Number of notifications skipped' })
  offset: number;
}

/**
 * Response DTO for unread count
 */
export class UnreadCountResponseDto {
  @ApiProperty({ description: 'Number of unread notifications' })
  count: number;
}
