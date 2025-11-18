import { BaseResponseDto, createTypedApiDecorators } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class MessageResponseDto extends BaseResponseDto {
  @ApiProperty({
    example: 'Hello, how can I help you today?',
    description: 'The message content',
  })
  @IsString()
  content!: string;

  @ApiProperty({
    example: '2024-11-10T10:00:00Z',
    description: 'When the message was sent',
    type: String,
    format: 'date-time',
  })
  sentAt!: Date | string;

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
  @Transform(({ value }) => value ?? undefined)
  sessionId?: string | null;

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
    example: {
      id: 'sender-id-123',
      name: 'John Doe',
      email: 'john@example.com',
    },
  })
  sender?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiPropertyOptional({
    description: 'Receiver account summary information',
    example: {
      id: 'receiver-id-456',
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
  })
  receiver?: {
    id: string;
    name: string;
    email: string;
  };
}

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
