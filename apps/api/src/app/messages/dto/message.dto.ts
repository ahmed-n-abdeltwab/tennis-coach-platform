import { createTypedApiDecorators } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

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
  @ApiProperty({ example: 'message-id-123' })
  @IsString()
  id!: string;

  @ApiProperty({ type: Date, format: 'date-time' })
  @IsDate()
  @Type(() => String)
  createdAt!: Date;

  @ApiProperty({ type: Date, format: 'date-time' })
  @IsDate()
  @Type(() => String)
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
  @Type(() => String)
  sentAt!: Date;

  @ApiProperty({
    example: 'sender-id-123',
    description: 'ID of the account that sent the message',
  })
  @IsString()
  senderId!: string;

  @ApiProperty({
    example: 'receiver-id-456',
    description: 'ID of the account that received the message',
  })
  @IsString()
  receiverId!: string;

  @ApiPropertyOptional({
    example: 'session-id-789',
    description: 'Associated session ID if the message is related to a specific session',
  })
  @IsOptional()
  @IsString()
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
  receiverId!: string;

  @ApiPropertyOptional({
    example: 'session-id-789',
    description: 'Optional session ID if the message is related to a specific session',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
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
}

// Create typed API decorators for messages
export const MessageApiResponses = createTypedApiDecorators(MessageResponseDto);
