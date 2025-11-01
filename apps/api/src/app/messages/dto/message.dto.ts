import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @IsString()
  receiverType: string; // 'user' | 'coach'
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
