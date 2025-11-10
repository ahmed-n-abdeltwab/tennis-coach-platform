import { BaseResponseDto, createTypedApiDecorators } from '@common';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class MessageResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'Hello, how can I help you today?' })
  content: string;

  @ApiProperty({ example: '2024-11-10T10:00:00Z', description: 'When the message was sent' })
  sentAt: string;

  @ApiProperty({ example: 'sender-id-123' })
  senderId: string;

  @ApiProperty({ example: 'receiver-id-456' })
  receiverId: string;

  @ApiProperty({
    required: false,
    example: 'session-id-789',
    description: 'Associated session ID if applicable',
  })
  sessionId?: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  senderType: Role;

  @ApiProperty({ enum: Role, example: Role.COACH })
  receiverType: Role;

  @ApiProperty({ required: false, description: 'Sender account summary' })
  sender?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({ required: false, description: 'Receiver account summary' })
  receiver?: {
    id: string;
    name: string;
    email: string;
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
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

// Create typed API decorators for messages
export const MessageApiResponses = createTypedApiDecorators(MessageResponseDto);
