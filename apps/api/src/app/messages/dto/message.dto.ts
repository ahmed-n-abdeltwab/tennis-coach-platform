import { createTypedApiDecorators } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class MessageResponseDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Hello, how can I help you today?' })
  content: string;

  @ApiProperty({ example: '2024-11-10T10:00:00Z', description: 'When the message was sent' })
  sentAt: Date | string;

  @ApiProperty({ example: 'sender-id-123' })
  senderId: string;

  @ApiProperty({ example: 'receiver-id-456' })
  receiverId: string;

  @ApiPropertyOptional({
    example: 'session-id-789',
    description: 'Associated session ID if applicable',
  })
  sessionId?: string | null;

  @ApiProperty({ enum: Role, example: Role.USER })
  senderType: Role;

  @ApiProperty({ enum: Role, example: Role.COACH })
  receiverType: Role;

  @ApiProperty({ description: 'Sender account summary' })
  sender: {
    id: string;
    name: string;
    role: Role;
  };

  @ApiProperty({ description: 'Receiver account summary' })
  receiver: {
    id: string;
    name: string;
    role: Role;
  };
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  receiverType: Role;
}

export class GetMessagesQuery {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

// Create typed API decorators for messages
export const MessageApiResponses = createTypedApiDecorators(MessageResponseDto);
