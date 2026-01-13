import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Summary DTO for the last message in a conversation.
 * Contains basic message information for display purposes.
 */
export class LastMessageSummaryDto {
  @ApiProperty({ example: 'message-id-123' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Hello, how can I help you today?' })
  @IsString()
  content!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  sentAt!: Date;

  @ApiProperty({ example: 'sender-id-123' })
  @IsString()
  senderId!: string;

  @ApiProperty({ enum: MessageType, example: MessageType.TEXT })
  @IsEnum(MessageType)
  messageType!: MessageType;
}

/**
 * Response DTO for Conversation entity.
 * Contains all conversation fields with proper decorators for Swagger and validation.
 */
export class ConversationResponseDto {
  @ApiProperty({ example: 'conversation-id-123' })
  @IsString()
  id!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;

  @ApiProperty({
    type: [String],
    example: ['user-id-123', 'coach-id-456'],
    description: 'Array of participant account IDs',
  })
  participantIds!: string[];

  @ApiPropertyOptional({
    example: 'message-id-789',
    description: 'ID of the last message in this conversation',
  })
  @IsOptional()
  @IsString()
  lastMessageId?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2024-11-10T10:30:00Z',
    description: 'When the last message was sent',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lastMessageAt?: Date;

  @ApiProperty({
    example: false,
    description: 'Whether this conversation is pinned by the current user',
  })
  @IsBoolean()
  isPinned!: boolean;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2024-11-10T11:00:00Z',
    description: 'When the conversation was pinned',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  pinnedAt?: Date;

  @ApiPropertyOptional({
    example: 'user-id-123',
    description: 'ID of the user who pinned this conversation',
  })
  @IsOptional()
  @IsString()
  pinnedBy?: string;

  @ApiPropertyOptional({
    description: 'Last message summary information',
    type: LastMessageSummaryDto,
  })
  @IsOptional()
  @Type(() => LastMessageSummaryDto)
  lastMessage?: LastMessageSummaryDto;

  @ApiPropertyOptional({
    example: 3,
    description: 'Number of unread messages for the current user',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  unreadCount?: number;
}

/**
 * Query parameters for filtering conversations.
 */
export class GetConversationsQuery {
  @ApiPropertyOptional({
    example: false,
    description: 'Filter by pinned status',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  isPinned?: boolean;

  @ApiPropertyOptional({
    example: 20,
    description: 'Limit number of results',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Offset for pagination',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}

/**
 * DTO for pinning a conversation.
 */
export class PinConversationDto {
  @ApiPropertyOptional({
    example: 'Important conversation with client',
    description: 'Optional note for pinning',
  })
  @IsString()
  @IsOptional()
  note?: string;
}
