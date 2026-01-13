import { IsCuid } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType, Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Summary DTO for message participants (sender/receiver).
 * Contains basic account information for display purposes.
 */
export class ParticipantSummaryDto {
  @ApiProperty({ example: 'user-id-123' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;
}

/**
 * Response DTO for Message entity.
 * Contains all message fields with proper decorators for Swagger and validation.
 */
export class MessageResponseDto {
  @ApiProperty()
  @IsString()
  @IsCuid()
  id!: string;

  @ApiProperty({ type: Date, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ type: Date, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;

  @ApiProperty({
    example: 'Hello, how can I help you today?',
    description: 'The message content',
  })
  @IsString()
  content!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-11-10T10:00:00Z',
    description: 'When the message was sent',
  })
  @IsDate()
  @Type(() => Date)
  sentAt!: Date;

  @ApiProperty({
    example: 'sender-id-123',
    description: 'ID of the account that sent the message',
  })
  @IsString()
  @IsCuid()
  senderId!: string;

  @ApiProperty({
    example: 'receiver-id-456',
    description: 'ID of the account that received the message',
  })
  @IsString()
  @IsCuid()
  receiverId!: string;

  @ApiPropertyOptional({
    example: 'session-id-789',
    description: 'Associated session ID if the message is related to a specific session',
  })
  @IsOptional()
  @IsString()
  @IsCuid()
  sessionId?: string;

  @ApiProperty({
    enum: Role,
    example: Role.USER,
    description: 'Role of the sender',
  })
  @IsEnum(Role)
  senderType!: Role;

  @ApiProperty({
    enum: Role,
    example: Role.COACH,
    description: 'Role of the receiver',
  })
  @IsEnum(Role)
  receiverType!: Role;

  @ApiProperty({
    enum: MessageType,
    example: MessageType.TEXT,
    description: 'Type of the message',
  })
  @IsEnum(MessageType)
  messageType!: MessageType;

  @ApiPropertyOptional({
    example: 'custom-service-id-123',
    description: 'Associated custom service ID if the message contains a custom service',
  })
  @IsOptional()
  @IsString()
  @IsCuid()
  customServiceId?: string;

  @ApiPropertyOptional({
    example: 'conversation-id-456',
    description: 'Associated conversation ID',
  })
  @IsOptional()
  @IsString()
  @IsCuid()
  conversationId?: string;

  @ApiProperty({
    example: false,
    description: 'Whether the message has been read',
  })
  @IsBoolean()
  isRead!: boolean;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2024-11-10T10:30:00Z',
    description: 'When the message was read',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  readAt?: Date;

  @ApiPropertyOptional({
    description: 'Sender account summary information',
    type: ParticipantSummaryDto,
  })
  @IsOptional()
  @Type(() => ParticipantSummaryDto)
  sender?: ParticipantSummaryDto;

  @ApiPropertyOptional({
    description: 'Receiver account summary information',
    type: ParticipantSummaryDto,
  })
  @IsOptional()
  @Type(() => ParticipantSummaryDto)
  receiver?: ParticipantSummaryDto;
}

/**
 * DTO for creating a new message.
 */
export class CreateMessageDto {
  @ApiProperty({
    example: 'Hello, I have a question about my upcoming session.',
    description: 'The message content',
  })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiProperty({
    example: 'receiver-id-456',
    description: 'ID of the account that will receive the message',
  })
  @IsString()
  @IsCuid()
  receiverId!: string;

  @ApiPropertyOptional({
    example: 'session-id-789',
    description: 'Optional session ID if the message is related to a specific session',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    enum: MessageType,
    example: MessageType.TEXT,
    description: 'Type of the message',
  })
  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType;

  @ApiPropertyOptional({
    example: 'custom-service-id-123',
    description: 'Associated custom service ID if the message contains a custom service',
  })
  @IsOptional()
  @IsCuid()
  customServiceId?: string;
}

/**
 * Query parameters for filtering messages.
 */
export class GetMessagesQuery {
  @ApiPropertyOptional({
    example: 'session-id-789',
    description: 'Filter messages by session ID',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    example: 'user-id-123',
    description: 'Get conversation between current user and this user ID',
  })
  @IsOptional()
  @IsString()
  conversationWith?: string;

  @ApiPropertyOptional({
    example: 'conversation-id-456',
    description: 'Filter messages by conversation ID',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    enum: MessageType,
    example: MessageType.TEXT,
    description: 'Filter messages by type',
  })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;
}

/**
 * DTO for marking a message as read.
 */
export class MarkMessageReadDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Whether the message is read',
  })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
